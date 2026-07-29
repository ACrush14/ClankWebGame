import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "colyseus.js";
import type { Room } from "colyseus.js";

export interface PlayerSnapshot {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  ready: boolean;
  isBot: boolean;
  knockedOut: boolean;
  handCount: number;
  drawPileCount: number;
  discardPileCount: number;
  skill: number;
  swords: number;
  boots: number;
  gold: number;
  clank: number;
  damage: number;
  roomId: string;
  points: number;
  artifactPoints: number;
  artifactsCarried: number;
  monkeyIdolsHeld: number;
  hasMasterKey: boolean;
  hasBackpack: boolean;
  hasLeftDungeon: boolean;
  /** -1 enquanto a partida não terminou. */
  finalScore: number;
}

/** Ícones possíveis numa opção de escolha "X -OU- Y" (ver `PendingChoiceSnapshot`). */
export type ChoiceIcon = "skill" | "swords" | "boots" | "gold" | "clank" | "heal" | "drawCards";

export interface PendingChoiceOption {
  icon: ChoiceIcon;
  amount: number;
  label: string;
}

/** Escolha "X -OU- Y" pendente do jogador da vez (ex: Shrine "USE: $1 -OU- cura 1"). */
export interface PendingChoiceSnapshot {
  cardName: string;
  options: PendingChoiceOption[];
}

/** Teleporte pendente (ex: Teleporter, Invoker of the Ancients) — ver `PendingChoiceSnapshot`. */
export interface PendingTeleportSnapshot {
  cardId: string;
  cardName: string;
}

export interface RoomSnapshot {
  players: PlayerSnapshot[];
  phase: "lobby" | "playing" | "ended";
  log: string[];
  currentPlayerId: string;
  turnNumber: number;
  /** 5 posições; string vazia representa slot vazio. */
  dungeonRowSlots: string[];
  reserveRemaining: Record<string, number>;
  dragonRageTrack: number;
  /** Cubos pretos ainda disponíveis no saco — pool persistente, não recriado a cada ataque. */
  blackCubesInBag: number;
  /** Ids de sala cujo artefato já foi pego. */
  claimedArtifacts: Record<string, boolean>;
  /** Nomes de Ídolo de Macaco já pegos (ex: "Macaco Surdo"). */
  claimedMonkeyIdols: Record<string, boolean>;
  countdownTrack: number;
  /** Id do jogador andando na Trilha de Contagem Regressiva; "" = ninguém ainda. */
  countdownPlayerId: string;
  marketKeysRemaining: number;
  marketBackpacksRemaining: number;
  marketCrownsAvailable: number[];
  /** null quando não há nenhuma escolha pendente pro jogador da vez. */
  pendingChoice: PendingChoiceSnapshot | null;
  /** null quando não há nenhum Teleporte pendente pro jogador da vez. */
  pendingTeleport: PendingTeleportSnapshot | null;
  /** Código amigável de 4 dígitos (o que aparece pro jogador) — não é o id interno do Colyseus. */
  roomCode: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
/** Mesma origem do servidor, mas em http(s):// em vez de ws(s):// — usado só pra resolver código de sala → roomId real (ver /room-code/:code no server). */
const SERVER_HTTP_URL = SERVER_URL.replace(/^ws/, "http");

/** Guarda o token de reconexão da sala atual — sobrevive a refresh de página/fechar aba sem querer. */
const RECONNECT_KEY = "clank_reconnect";

function readReconnectToken(): string | null {
  try {
    const raw = localStorage.getItem(RECONNECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function saveReconnectToken(token: string) {
  try {
    localStorage.setItem(RECONNECT_KEY, JSON.stringify({ token }));
  } catch {
    // localStorage indisponível (ex: modo privado) — sem-op, só perde a reconexão automática
  }
}

function clearReconnectToken() {
  try {
    localStorage.removeItem(RECONNECT_KEY);
  } catch {
    // sem-op
  }
}

export function useClankRoom() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);
  const tryReconnectRef = useRef<() => void>(() => {});
  const [room, setRoom] = useState<Room | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  if (!clientRef.current) {
    clientRef.current = new Client(SERVER_URL);
  }

  const applySnapshot = useCallback((r: Room) => {
    const state = r.state as unknown as {
      players?: Map<string, PlayerSnapshot>;
      phase: "lobby" | "playing" | "ended";
      log: string[];
      currentPlayerId: string;
      turnNumber: number;
      dungeonRowSlots: string[];
      reserveRemaining: Map<string, number>;
      dragonRageTrack: number;
      blackCubesInBag: number;
      claimedArtifacts: Map<string, boolean>;
      claimedMonkeyIdols: Map<string, boolean>;
      countdownTrack: number;
      countdownPlayerId: string;
      marketKeysRemaining: number;
      marketBackpacksRemaining: number;
      marketCrownsAvailable: number[];
      pendingChoiceJson: string;
      pendingTeleportJson: string;
      roomCode: string;
    };
    if (!state || !state.players) return;
    const players: PlayerSnapshot[] = [];
    state.players.forEach((p, id: string) => {
      players.push({
        id,
        name: p.name,
        color: p.color,
        connected: p.connected,
        ready: p.ready,
        isBot: p.isBot,
        knockedOut: p.knockedOut,
        handCount: p.handCount,
        drawPileCount: p.drawPileCount,
        discardPileCount: p.discardPileCount,
        skill: p.skill,
        swords: p.swords,
        boots: p.boots,
        gold: p.gold,
        clank: p.clank,
        damage: p.damage,
        roomId: p.roomId,
        points: p.points,
        artifactPoints: p.artifactPoints,
        artifactsCarried: p.artifactsCarried,
        monkeyIdolsHeld: p.monkeyIdolsHeld,
        hasMasterKey: p.hasMasterKey,
        hasBackpack: p.hasBackpack,
        hasLeftDungeon: p.hasLeftDungeon,
        finalScore: p.finalScore,
      });
    });
    let pendingChoice: PendingChoiceSnapshot | null = null;
    if (state.pendingChoiceJson) {
      try {
        pendingChoice = JSON.parse(state.pendingChoiceJson) as PendingChoiceSnapshot;
      } catch {
        pendingChoice = null;
      }
    }
    let pendingTeleport: PendingTeleportSnapshot | null = null;
    if (state.pendingTeleportJson) {
      try {
        pendingTeleport = JSON.parse(state.pendingTeleportJson) as PendingTeleportSnapshot;
      } catch {
        pendingTeleport = null;
      }
    }
    const reserveRemaining: Record<string, number> = {};
    state.reserveRemaining?.forEach((count, id: string) => {
      reserveRemaining[id] = count;
    });
    const claimedArtifacts: Record<string, boolean> = {};
    state.claimedArtifacts?.forEach((claimed, id: string) => {
      claimedArtifacts[id] = claimed;
    });
    const claimedMonkeyIdols: Record<string, boolean> = {};
    state.claimedMonkeyIdols?.forEach((claimed, name: string) => {
      claimedMonkeyIdols[name] = claimed;
    });
    setSnapshot({
      players,
      phase: state.phase,
      log: Array.from(state.log),
      currentPlayerId: state.currentPlayerId,
      turnNumber: state.turnNumber,
      dungeonRowSlots: Array.from(state.dungeonRowSlots ?? []),
      reserveRemaining,
      dragonRageTrack: state.dragonRageTrack,
      blackCubesInBag: state.blackCubesInBag,
      claimedArtifacts,
      claimedMonkeyIdols,
      countdownTrack: state.countdownTrack,
      countdownPlayerId: state.countdownPlayerId ?? "",
      marketKeysRemaining: state.marketKeysRemaining,
      marketBackpacksRemaining: state.marketBackpacksRemaining,
      marketCrownsAvailable: Array.from(state.marketCrownsAvailable ?? []),
      pendingChoice,
      pendingTeleport,
      roomCode: state.roomCode ?? "",
    });
  }, []);

  const bindRoom = useCallback(
    (r: Room) => {
      roomRef.current = r;
      setRoom(r);
      applySnapshot(r);
      saveReconnectToken(r.reconnectionToken);
      r.onStateChange(() => applySnapshot(r));
      r.onMessage("hand", (cards: string[]) => setHand(cards));
      r.onMessage("error", (message: string) => {
        setActionError(message);
        setTimeout(() => setActionError(null), 4000);
      });
      r.onLeave(() => {
        roomRef.current = null;
        setRoom(null);
        setSnapshot(null);
        setHand([]);
        // Se a saída foi voluntária (botão "Sair"), o token já foi limpo antes disso —
        // tryReconnect vira um no-op. Se foi queda de conexão, tenta voltar sozinho.
        tryReconnectRef.current();
      });
    },
    [applySnapshot],
  );

  const tryReconnect = useCallback(async () => {
    const token = readReconnectToken();
    if (!token || roomRef.current) return;
    setReconnecting(true);
    try {
      const r = await clientRef.current!.reconnect(token);
      bindRoom(r);
    } catch {
      clearReconnectToken();
    } finally {
      setReconnecting(false);
    }
  }, [bindRoom]);

  useEffect(() => {
    tryReconnectRef.current = () => void tryReconnect();
  }, [tryReconnect]);

  // Ao carregar a página (refresh, aba reaberta), tenta reconectar automaticamente
  // se ainda houver um token válido guardado.
  useEffect(() => {
    void tryReconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(
    async (name: string) => {
      setConnecting(true);
      setError(null);
      try {
        const r = await clientRef.current!.create("clank", {});
        bindRoom(r);
        r.send("set_name", name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao criar sala.");
      } finally {
        setConnecting(false);
      }
    },
    [bindRoom],
  );

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      setConnecting(true);
      setError(null);
      try {
        const res = await fetch(`${SERVER_HTTP_URL}/room-code/${encodeURIComponent(code.trim())}`);
        if (!res.ok) throw new Error("Sala não encontrada.");
        const { roomId } = (await res.json()) as { roomId: string };
        const r = await clientRef.current!.joinById(roomId, {});
        bindRoom(r);
        r.send("set_name", name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sala não encontrada.");
      } finally {
        setConnecting(false);
      }
    },
    [bindRoom],
  );

  const toggleReady = useCallback(() => {
    roomRef.current?.send("toggle_ready");
  }, []);

  const addBot = useCallback(() => {
    roomRef.current?.send("add_bot");
  }, []);

  const removeBot = useCallback((botId: string) => {
    roomRef.current?.send("remove_bot", botId);
  }, []);

  const setColor = useCallback((color: string) => {
    roomRef.current?.send("set_color", color);
  }, []);

  const startGame = useCallback(() => {
    roomRef.current?.send("start_game");
  }, []);

  const playCard = useCallback((cardId: string) => {
    setActionError(null);
    roomRef.current?.send("play_card", cardId);
  }, []);

  /** Joga toda a mão numa mensagem só — ver `GameEngine.playAllCards` pro motivo de ser atômico. */
  const playAllCards = useCallback(() => {
    setActionError(null);
    roomRef.current?.send("play_all_cards");
  }, []);

  const acquireCard = useCallback((slotIndex: number) => {
    setActionError(null);
    roomRef.current?.send("acquire_card", slotIndex);
  }, []);

  const fightMonster = useCallback((slotIndex: number) => {
    setActionError(null);
    roomRef.current?.send("fight_monster", slotIndex);
  }, []);

  const acquireFromReserve = useCallback((cardId: string) => {
    setActionError(null);
    roomRef.current?.send("acquire_from_reserve", cardId);
  }, []);

  const movePlayer = useCallback((toRoomId: string) => {
    setActionError(null);
    roomRef.current?.send("move_player", toRoomId);
  }, []);

  const teleportTo = useCallback((toRoomId: string) => {
    setActionError(null);
    roomRef.current?.send("teleport_to", toRoomId);
  }, []);

  const takeArtifact = useCallback(() => {
    setActionError(null);
    roomRef.current?.send("take_artifact");
  }, []);

  const resolveChoice = useCallback((optionIndex: number) => {
    setActionError(null);
    roomRef.current?.send("resolve_choice", optionIndex);
  }, []);

  const leaveDungeon = useCallback(() => {
    setActionError(null);
    roomRef.current?.send("leave_dungeon");
  }, []);

  const buyMarketItem = useCallback((item: "key" | "backpack" | "crown") => {
    setActionError(null);
    roomRef.current?.send("buy_market_item", item);
  }, []);

  const endTurn = useCallback(() => {
    setActionError(null);
    roomRef.current?.send("end_turn");
  }, []);

  const leaveRoom = useCallback(() => {
    clearReconnectToken();
    roomRef.current?.leave();
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
    };
  }, []);

  return {
    room,
    snapshot,
    hand,
    error,
    actionError,
    connecting,
    reconnecting,
    createRoom,
    joinRoom,
    toggleReady,
    addBot,
    removeBot,
    setColor,
    startGame,
    playCard,
    playAllCards,
    acquireCard,
    fightMonster,
    acquireFromReserve,
    movePlayer,
    teleportTo,
    takeArtifact,
    resolveChoice,
    leaveDungeon,
    buyMarketItem,
    endTurn,
    leaveRoom,
  };
}
