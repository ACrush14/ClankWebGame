import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "colyseus.js";
import type { Room } from "colyseus.js";

export interface PlayerSnapshot {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
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
}

export interface RoomSnapshot {
  players: PlayerSnapshot[];
  phase: "lobby" | "playing";
  log: string[];
  currentPlayerId: string;
  turnNumber: number;
  /** 5 posições; string vazia representa slot vazio. */
  dungeonRowSlots: string[];
  reserveRemaining: Record<string, number>;
  dragonRageTrack: number;
  /** Ids de sala cujo artefato já foi pego. */
  claimedArtifacts: Record<string, boolean>;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export function useClankRoom() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  if (!clientRef.current) {
    clientRef.current = new Client(SERVER_URL);
  }

  const applySnapshot = useCallback((r: Room) => {
    const state = r.state as unknown as {
      players?: Map<string, PlayerSnapshot>;
      phase: "lobby" | "playing";
      log: string[];
      currentPlayerId: string;
      turnNumber: number;
      dungeonRowSlots: string[];
      reserveRemaining: Map<string, number>;
      dragonRageTrack: number;
      claimedArtifacts: Map<string, boolean>;
    };
    if (!state || !state.players) return;
    const players: PlayerSnapshot[] = [];
    state.players.forEach((p, id: string) => {
      players.push({
        id,
        name: p.name,
        connected: p.connected,
        ready: p.ready,
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
      });
    });
    const reserveRemaining: Record<string, number> = {};
    state.reserveRemaining?.forEach((count, id: string) => {
      reserveRemaining[id] = count;
    });
    const claimedArtifacts: Record<string, boolean> = {};
    state.claimedArtifacts?.forEach((claimed, id: string) => {
      claimedArtifacts[id] = claimed;
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
      claimedArtifacts,
    });
  }, []);

  const bindRoom = useCallback(
    (r: Room) => {
      roomRef.current = r;
      setRoom(r);
      applySnapshot(r);
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
      });
    },
    [applySnapshot],
  );

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
    async (roomId: string, name: string) => {
      setConnecting(true);
      setError(null);
      try {
        const r = await clientRef.current!.joinById(roomId.trim(), {});
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

  const startGame = useCallback(() => {
    roomRef.current?.send("start_game");
  }, []);

  const playCard = useCallback((cardId: string) => {
    setActionError(null);
    roomRef.current?.send("play_card", cardId);
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

  const takeArtifact = useCallback(() => {
    setActionError(null);
    roomRef.current?.send("take_artifact");
  }, []);

  const endTurn = useCallback(() => {
    setActionError(null);
    roomRef.current?.send("end_turn");
  }, []);

  const leaveRoom = useCallback(() => {
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
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    playCard,
    acquireCard,
    fightMonster,
    acquireFromReserve,
    movePlayer,
    takeArtifact,
    endTurn,
    leaveRoom,
  };
}
