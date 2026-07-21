import { buildDungeonDeck, getCard, RESERVE_INFINITE, RESERVE_STARTING_COUNTS } from "./cards.js";
import { BOARD } from "./board.js";
import { drawCards, shuffle, type Rng } from "./deck.js";
import { createPlayer, drawHand, HAND_SIZE } from "./player.js";
import type { CardEffects, DragonState, PlayerState, ReserveState } from "./types.js";
import { emptyResources, HEALTH_TRACK_SIZE } from "./types.js";

export const DUNGEON_ROW_SIZE = 5;
const MAX_LOG_LINES = 30;
/**
 * Quantidade de cubos "pretos" (neutros) sempre disponíveis no saco do dragão.
 * ⚠️ Estimativa baseada na contagem de componentes ("24 dragon cubes") — não confirmei
 * se essa é exatamente a mecânica de reposição do saco entre ataques.
 */
const BLACK_CUBE_COUNT = 24;

export interface DungeonRowState {
  /** 5 posições visíveis; null enquanto o monte de compra estiver vazio. */
  slots: (string | null)[];
  drawPile: string[];
  discardPile: string[];
}

export interface GameState {
  players: PlayerState[];
  currentPlayerIndex: number;
  dungeonRow: DungeonRowState;
  reserve: ReserveState;
  dragon: DragonState;
  /** Salas cujo artefato já foi pego (por id de sala). */
  claimedArtifacts: Record<string, boolean>;
  turnNumber: number;
  phase: "playing" | "ended";
  log: string[];
}

export class GameEngine {
  state: GameState;
  private rng: Rng;

  constructor(playerInfos: { id: string; name: string }[], rng: Rng = Math.random) {
    if (playerInfos.length < 1) throw new Error("Precisa de ao menos 1 jogador.");
    this.rng = rng;

    const players = playerInfos.map((p) => createPlayer(p.id, p.name, rng));

    const dungeonDeck = shuffle(buildDungeonDeck(), rng);
    const slots: (string | null)[] = dungeonDeck.splice(0, DUNGEON_ROW_SIZE);
    while (slots.length < DUNGEON_ROW_SIZE) slots.push(null);

    this.state = {
      players: players.map((p) => drawHand(p, rng)),
      currentPlayerIndex: 0,
      dungeonRow: { slots, drawPile: dungeonDeck, discardPile: [] },
      reserve: { remaining: { ...RESERVE_STARTING_COUNTS } },
      dragon: { rageTrackPosition: 1 },
      claimedArtifacts: {},
      turnNumber: 1,
      phase: "playing",
      log: [],
    };
  }

  get currentPlayer(): PlayerState {
    return this.state.players[this.state.currentPlayerIndex];
  }

  private requireCurrentPlayer(playerId: string): PlayerState {
    const player = this.currentPlayer;
    if (player.id !== playerId) {
      throw new Error(`Não é a vez de ${playerId} — é a vez de ${player.name}.`);
    }
    if (player.knockedOut) {
      throw new Error(`${player.name} está nocauteado e não pode jogar.`);
    }
    return player;
  }

  private applyEffects(player: PlayerState, effects: CardEffects | undefined) {
    if (!effects) return;
    if (effects.skill) player.resources.skill += effects.skill;
    if (effects.swords) player.resources.swords += effects.swords;
    if (effects.boots) player.resources.boots += effects.boots;
    if (effects.gold) player.resources.gold += effects.gold;
    // Clamp em 0: algumas cartas reais do jogo removem Clank (ex: "Move Silently"),
    // mas o Clank do jogador nunca é negativo.
    if (effects.clank) player.clank = Math.max(0, player.clank + effects.clank);
    if (effects.drawCards) {
      const { drawn, drawPile, discardPile } = drawCards(
        player.drawPile,
        player.discardPile,
        effects.drawCards,
        this.rng,
      );
      player.hand.push(...drawn);
      player.drawPile = drawPile;
      player.discardPile = discardPile;
    }
  }

  private damagePlayer(player: PlayerState, amount: number) {
    player.damage = Math.min(HEALTH_TRACK_SIZE, player.damage + amount);
    if (player.damage >= HEALTH_TRACK_SIZE && !player.knockedOut) {
      player.knockedOut = true;
      this.pushLog(`${player.name} foi nocauteado!`);
    }
  }

  /**
   * Move o jogador por um túnel até uma sala vizinha. Túnel com pegada custa 2 Boots
   * em vez de 1. Túnel com monstro: paga Swords automaticamente se o jogador tiver o
   * suficiente; senão, leva 1 de dano (regra oficial: "gaste uma espada ou sofra um
   * ferimento" — aqui a espada é paga automaticamente quando disponível).
   */
  movePlayer(playerId: string, toRoomId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const room = BOARD.rooms[player.roomId];
    if (!room) throw new Error(`Sala atual desconhecida: ${player.roomId}`);
    const tunnel = room.tunnels.find((t) => t.to === toRoomId);
    if (!tunnel) throw new Error(`Não há túnel de ${room.name} para ${toRoomId}.`);

    const bootCost = tunnel.icon?.footprint ? 2 : 1;
    if (player.resources.boots < bootCost) {
      throw new Error(`Boots insuficientes pra mover (precisa ${bootCost}, tem ${player.resources.boots}).`);
    }
    player.resources.boots -= bootCost;

    const monsterCost = tunnel.icon?.monsterSwordCost;
    if (monsterCost) {
      if (player.resources.swords >= monsterCost) {
        player.resources.swords -= monsterCost;
      } else {
        this.damagePlayer(player, 1);
        this.pushLog(`${player.name} levou dano passando por um túnel com monstro.`);
      }
    }

    player.roomId = toRoomId;
  }

  /** Pega o artefato da sala atual (se houver e ainda não tiver sido pego). Avança a Trilha de Fúria. */
  takeArtifact(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const room = BOARD.rooms[player.roomId];
    if (!room?.artifactValue) throw new Error(`${room?.name ?? player.roomId} não tem artefato.`);
    if (this.state.claimedArtifacts[room.id]) throw new Error(`O artefato de ${room.name} já foi pego.`);

    this.state.claimedArtifacts[room.id] = true;
    player.points += room.artifactValue;
    this.state.dragon.rageTrackPosition += 1;
    this.pushLog(`${player.name} pegou um artefato (${room.artifactValue} pontos) em ${room.name}! O dragão está mais irritado.`);
  }

  /**
   * Ataque do dragão: sorteia cubos do saco (jogadores + cubos pretos neutros) em
   * quantidade igual à posição atual na Trilha de Fúria menos 1 (regra confirmada:
   * "5ª casa da trilha sorteia 4 cubos"). Cubo de um jogador = 1 dano pra ele.
   */
  private triggerDragonAttack() {
    const drawCount = Math.max(0, this.state.dragon.rageTrackPosition - 1);
    if (drawCount === 0) return;

    const tickets: (string | null)[] = [];
    for (const player of this.state.players) {
      for (let i = 0; i < player.clank; i++) tickets.push(player.id);
    }
    for (let i = 0; i < BLACK_CUBE_COUNT; i++) tickets.push(null);

    let blackDrawn = 0;
    const damagedNames: string[] = [];
    for (let i = 0; i < drawCount && tickets.length > 0; i++) {
      const idx = Math.floor(this.rng() * tickets.length);
      const [drawnId] = tickets.splice(idx, 1);
      if (drawnId === null) {
        blackDrawn++;
        continue;
      }
      const player = this.state.players.find((p) => p.id === drawnId);
      if (!player) continue;
      player.clank = Math.max(0, player.clank - 1);
      this.damagePlayer(player, 1);
      damagedNames.push(player.name);
    }

    this.pushLog(
      `O dragão atacou! ${drawCount} cubo(s) sorteado(s): ${damagedNames.length > 0 ? damagedNames.join(", ") + " levou(aram) dano" : "nenhum jogador atingido"}${blackDrawn > 0 ? ` (${blackDrawn} preto(s))` : ""}.`,
    );
  }

  private pushLog(line: string) {
    this.state.log.push(line);
    while (this.state.log.length > MAX_LOG_LINES) this.state.log.shift();
  }

  /** Joga uma carta da mão (por id) — aplica os efeitos e move pro monte "jogadas nesta rodada". */
  playCard(playerId: string, cardId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const handIndex = player.hand.indexOf(cardId);
    if (handIndex === -1) throw new Error(`${cardId} não está na mão de ${player.name}.`);

    const card = getCard(cardId);
    player.hand.splice(handIndex, 1);
    player.playedThisTurn.push(cardId);
    this.applyEffects(player, card.playEffects);
  }

  /** Compra uma carta da Dungeon Row pagando Skill — vai pro descarte do jogador (entra no baralho dele). */
  acquireCard(playerId: string, slotIndex: number) {
    const player = this.requireCurrentPlayer(playerId);
    const cardId = this.state.dungeonRow.slots[slotIndex];
    if (!cardId) throw new Error(`Posição ${slotIndex} da Dungeon Row está vazia.`);

    const card = getCard(cardId);
    if (card.kind === "monster") throw new Error(`${card.name} é um monstro — use fightMonster.`);
    const cost = card.skillCost ?? 0;
    if (player.resources.skill < cost) {
      throw new Error(`Skill insuficiente pra comprar ${card.name} (precisa ${cost}, tem ${player.resources.skill}).`);
    }

    player.resources.skill -= cost;
    player.discardPile.push(cardId);
    this.applyEffects(player, card.acquireEffects);
    this.refillDungeonSlot(slotIndex);
  }

  /** Luta um monstro na Dungeon Row pagando Swords — vai pro descarte da masmorra, não pro baralho do jogador. */
  fightMonster(playerId: string, slotIndex: number) {
    const player = this.requireCurrentPlayer(playerId);
    const cardId = this.state.dungeonRow.slots[slotIndex];
    if (!cardId) throw new Error(`Posição ${slotIndex} da Dungeon Row está vazia.`);

    const card = getCard(cardId);
    if (card.kind !== "monster") throw new Error(`${card.name} não é um monstro — use acquireCard.`);
    const cost = card.swordCost ?? 0;
    if (player.resources.swords < cost) {
      throw new Error(`Swords insuficientes pra vencer ${card.name} (precisa ${cost}, tem ${player.resources.swords}).`);
    }

    player.resources.swords -= cost;
    this.state.dungeonRow.discardPile.push(cardId);
    this.applyEffects(player, card.acquireEffects);
    this.refillDungeonSlot(slotIndex);
  }

  /**
   * Adquire uma carta da Reserva (pilha fixa ao lado da Dungeon Row, não embaralhada).
   * Monstros (ex: Goblin) pagam Swords e NUNCA esgotam a pilha — podem ser lutados
   * várias vezes por turno. As demais pagam Skill e consomem uma cópia da pilha; ao
   * zerar, aquela carta some da Reserva pro resto do jogo.
   */
  acquireFromReserve(playerId: string, cardId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const card = getCard(cardId);
    const remaining = this.state.reserve.remaining[cardId] ?? 0;
    if (remaining <= 0) throw new Error(`${card.name} esgotou na Reserva.`);

    if (card.kind === "monster") {
      const cost = card.swordCost ?? 0;
      if (player.resources.swords < cost) {
        throw new Error(`Swords insuficientes pra vencer ${card.name} (precisa ${cost}, tem ${player.resources.swords}).`);
      }
      player.resources.swords -= cost;
      this.applyEffects(player, card.acquireEffects);
      if (!RESERVE_INFINITE.has(cardId)) {
        this.state.reserve.remaining[cardId] = remaining - 1;
      }
      return;
    }

    const cost = card.skillCost ?? 0;
    if (player.resources.skill < cost) {
      throw new Error(`Skill insuficiente pra comprar ${card.name} (precisa ${cost}, tem ${player.resources.skill}).`);
    }
    player.resources.skill -= cost;
    player.discardPile.push(cardId);
    this.applyEffects(player, card.acquireEffects);
    this.state.reserve.remaining[cardId] = remaining - 1;
  }

  private refillDungeonSlot(slotIndex: number) {
    const row = this.state.dungeonRow;
    if (row.drawPile.length === 0 && row.discardPile.length > 0) {
      row.drawPile = shuffle(row.discardPile, this.rng);
      row.discardPile = [];
    }
    const newCardId = row.drawPile.shift() ?? null;
    row.slots[slotIndex] = newCardId;
    if (newCardId && getCard(newCardId).triggersDragonAttack) {
      this.triggerDragonAttack();
    }
  }

  /** Descarta mão + cartas jogadas, compra 5 novas, zera recursos do turno e passa a vez. */
  endTurn(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);

    player.discardPile.push(...player.hand, ...player.playedThisTurn);
    player.hand = [];
    player.playedThisTurn = [];
    player.resources = emptyResources();

    // Muta o mesmo objeto (em vez de substituí-lo no array) pra qualquer referência
    // externa ao jogador (ex: sync do Colyseus) continuar válida depois do turno.
    const { drawn, drawPile, discardPile } = drawCards(player.drawPile, player.discardPile, HAND_SIZE, this.rng);
    player.hand = drawn;
    player.drawPile = drawPile;
    player.discardPile = discardPile;

    this.advanceTurn();
  }

  private advanceTurn() {
    const total = this.state.players.length;
    let next = this.state.currentPlayerIndex;
    for (let i = 0; i < total; i++) {
      next = (next + 1) % total;
      if (!this.state.players[next].knockedOut) break;
    }
    this.state.currentPlayerIndex = next;
    this.state.turnNumber += 1;
  }
}

export { HAND_SIZE };
