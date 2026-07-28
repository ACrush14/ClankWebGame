import { buildDungeonDeck, getCard, RESERVE_INFINITE, RESERVE_STARTING_COUNTS } from "./cards.js";
import { BOARD } from "./board.js";
import { drawCards, shuffle, type Rng } from "./deck.js";
import { createPlayer, drawHand, HAND_SIZE } from "./player.js";
import type {
  CardDefinition,
  CardEffects,
  DragonState,
  EffectChoiceOption,
  MarketState,
  PendingChoice,
  PlayerState,
  ReserveState,
} from "./types.js";
import {
  CROWN_VALUES,
  COUNTDOWN_TRACK_SIZE,
  emptyResources,
  HEALTH_TRACK_SIZE,
  MARKET_ITEM_COST,
  MONKEY_IDOL_VALUE,
} from "./types.js";

/** CONFIRMADO no manual oficial: "Shuffle the Dungeon Deck and deal six cards..." */
export const DUNGEON_ROW_SIZE = 6;
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
  market: MarketState;
  /** Salas cujo artefato já foi pego (por id de sala). */
  claimedArtifacts: Record<string, boolean>;
  /** Ídolos de Macaco já pegos, por nome (ex: "Macaco Surdo") — únicos no jogo todo. */
  claimedMonkeyIdols: Record<string, boolean>;
  turnNumber: number;
  phase: "playing" | "ended";
  log: string[];
  /** 0 = ainda não começou; 1..COUNTDOWN_TRACK_SIZE = casa atual de `countdownPlayerId` na trilha. */
  countdownTrack: number;
  /**
   * Id do primeiro jogador a sair da masmorra ou ser nocauteado — SÓ ele anda na
   * Trilha de Contagem Regressiva (regra oficial: os demais que saírem/forem
   * nocauteados depois NÃO usam a trilha). null até isso acontecer.
   */
  countdownPlayerId: string | null;
  /** Pontuação final por jogador — só definida quando `phase === "ended"`. */
  finalScores?: Record<string, number>;
  /**
   * Escolha "X -OU- Y" pendente do jogador da vez (ex: Shrine "USE: $1 -OU- cura 1").
   * Enquanto isso não for `null`, nenhuma outra ação do jogador é permitida — ele
   * precisa chamar `resolveChoice` primeiro (ver `requireCurrentPlayer`).
   */
  pendingChoice: PendingChoice | null;
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
      market: { masterKeyAvailable: true, backpackAvailable: true, crownsAvailable: [...CROWN_VALUES] },
      claimedArtifacts: {},
      claimedMonkeyIdols: {},
      turnNumber: 1,
      phase: "playing",
      log: [],
      countdownTrack: 0,
      countdownPlayerId: null,
      pendingChoice: null,
    };
  }

  get currentPlayer(): PlayerState {
    return this.state.players[this.state.currentPlayerIndex];
  }

  private requireCurrentPlayer(playerId: string): PlayerState {
    if (this.state.phase === "ended") {
      throw new Error("A partida já terminou.");
    }
    const player = this.currentPlayer;
    if (player.id !== playerId) {
      throw new Error(`Não é a vez de ${playerId} — é a vez de ${player.name}.`);
    }
    if (player.knockedOut) {
      throw new Error(`${player.name} está nocauteado e não pode jogar.`);
    }
    if (player.hasLeftDungeon) {
      throw new Error(`${player.name} já deixou a masmorra.`);
    }
    if (this.state.pendingChoice) {
      throw new Error(
        `${player.name} tem uma escolha pendente ("${this.state.pendingChoice.cardName}") — resolva com resolveChoice antes de continuar.`,
      );
    }
    return player;
  }

  /** Converte uma opção de escolha (ícone+quantidade) no `CardEffects` equivalente, pra reusar `applyEffects`. */
  private effectsFromChoice(option: EffectChoiceOption): CardEffects {
    return { [option.icon]: option.amount };
  }

  /**
   * Aplica os efeitos normais de uma carta, OU — se ela tiver `choices` (escolha
   * "X -OU- Y") — cria um `PendingChoice` em vez de aplicar qualquer coisa direto. O
   * jogador precisa chamar `resolveChoice` antes de fazer qualquer outra ação.
   */
  private applyEffectsOrSetChoice(
    player: PlayerState,
    card: CardDefinition,
    effects: CardEffects | undefined,
    choices: EffectChoiceOption[] | undefined,
  ) {
    if (choices && choices.length > 0) {
      this.state.pendingChoice = { cardId: card.id, cardName: card.nomePt, options: choices };
      return;
    }
    this.applyEffects(player, effects);
  }

  /**
   * Resolve uma escolha "X -OU- Y" pendente (ver `PendingChoice`) — só o jogador da vez
   * pode chamar, e só quando houver uma escolha pendente pra ele. Não passa pelo guard
   * normal de `requireCurrentPlayer` de propósito (esse guard bloqueia justamente
   * enquanto há uma escolha pendente).
   */
  resolveChoice(playerId: string, optionIndex: number) {
    if (this.state.phase === "ended") throw new Error("A partida já terminou.");
    const player = this.currentPlayer;
    if (player.id !== playerId) {
      throw new Error(`Não é a vez de ${playerId} — é a vez de ${player.name}.`);
    }
    const pending = this.state.pendingChoice;
    if (!pending) throw new Error("Não há escolha pendente.");
    const option = pending.options[optionIndex];
    if (!option) throw new Error(`Opção ${optionIndex} inválida (a carta tem ${pending.options.length} opções).`);

    this.applyEffects(player, this.effectsFromChoice(option));
    this.pushLog(`${player.name} escolheu "${option.label}" em ${pending.cardName}.`);
    this.state.pendingChoice = null;
  }

  private applyEffects(player: PlayerState, effects: CardEffects | undefined) {
    if (!effects) return;
    if (effects.skill) player.resources.skill += effects.skill;
    if (effects.swords) player.resources.swords += effects.swords;
    if (effects.boots) player.resources.boots += effects.boots;
    if (effects.gold) player.gold += effects.gold;
    // Clamp em 0: algumas cartas reais do jogo removem Clank (ex: "Move Silently"),
    // mas o Clank do jogador nunca é negativo.
    if (effects.clank) player.clank = Math.max(0, player.clank + effects.clank);
    if (effects.heal) player.damage = Math.max(0, player.damage - effects.heal);
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

  /**
   * Algumas cartas só podem ser adquiridas/enfrentadas numa sala com determinada flag
   * (ex: "Deep" = só nas Profundezas; Crystal Golem/Crystal Kobold = só na Caverna de
   * Cristal). CONFIRMADO no manual oficial e em fotos das cartas físicas.
   */
  private checkRoomRequirement(player: PlayerState, card: CardDefinition) {
    if (!card.requiresRoomFlag) return;
    const room = BOARD.rooms[player.roomId];
    if (!room?.[card.requiresRoomFlag]) {
      throw new Error(
        `${card.nomePt} só pode ser adquirida/enfrentada numa sala do tipo "${card.requiresRoomFlag}" (você está em ${room?.name ?? player.roomId}).`,
      );
    }
  }

  private damagePlayer(player: PlayerState, amount: number) {
    player.damage = Math.min(HEALTH_TRACK_SIZE, player.damage + amount);
    if (player.damage >= HEALTH_TRACK_SIZE && !player.knockedOut) {
      player.knockedOut = true;
      this.pushLog(`${player.name} foi nocauteado!`);
      this.startCountdownIfNeeded(player);
    }
  }

  /**
   * Na primeira vez que QUALQUER jogador sai da masmorra ou é nocauteado, ele (e só
   * ele) passa a andar na Trilha de Contagem Regressiva — ver `processCountdownStep`.
   */
  private startCountdownIfNeeded(player: PlayerState) {
    if (this.state.countdownPlayerId !== null) return;
    this.state.countdownPlayerId = player.id;
    this.state.countdownTrack = 1;
    this.pushLog(`${player.name} foi o primeiro a sair da masmorra ou ser nocauteado — a Trilha de Contagem Regressiva começou.`);
  }

  /**
   * Move o jogador por um túnel até uma sala vizinha. Túnel com pegada custa 2 Boots
   * em vez de 1. Túnel com monstro: paga Swords automaticamente se o jogador tiver o
   * suficiente; senão, leva 1 de dano (regra oficial: "gaste uma espada ou sofra um
   * ferimento" — aqui a espada é paga automaticamente quando disponível). Entrar numa
   * sala com Fonte de Cura (CONFIRMADO no manual oficial) cura 1 de dano na hora.
   * Entrar numa Caverna de Cristal (CONFIRMADO no manual oficial) esgota os Boots
   * restantes — não dá mais pra mover de novo neste turno (só via Teleporte, que o
   * motor ainda não modela).
   */
  movePlayer(playerId: string, toRoomId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const room = BOARD.rooms[player.roomId];
    if (!room) throw new Error(`Sala atual desconhecida: ${player.roomId}`);
    const tunnel = room.tunnels.find((t) => t.to === toRoomId);
    if (!tunnel) throw new Error(`Não há túnel de ${room.name} para ${toRoomId}.`);

    if (tunnel.icon?.locked && !player.hasMasterKey) {
      throw new Error(`Esse túnel tem um cadeado — precisa da Chave-mestra do Mercado.`);
    }

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
    const destRoom = BOARD.rooms[toRoomId];
    if (destRoom?.isFountainOfHealing && player.damage > 0) {
      player.damage = Math.max(0, player.damage - 1);
      this.pushLog(`${player.name} entrou numa Fonte de Cura: -1 dano.`);
    }
    if (destRoom?.isCrystalCave && player.resources.boots > 0) {
      player.resources.boots = 0;
      this.pushLog(`${player.name} entrou numa Caverna de Cristal e ficou exausto — sem mais Boots este turno.`);
    }
    this.checkGameEnd();
  }

  /**
   * Sai da masmorra pela Entrada — fica fora de jogo pro resto da partida. Se for a
   * primeira pessoa a sair, começa a Trilha de Contagem Regressiva (ver triggerDragonAttack).
   * Encerra o turno automaticamente (não tem mais o que fazer depois de sair).
   */
  leaveDungeon(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    if (player.roomId !== BOARD.entranceRoomId) {
      throw new Error(`Só dá pra sair da masmorra pela ${BOARD.rooms[BOARD.entranceRoomId].name}.`);
    }

    player.hasLeftDungeon = true;
    this.pushLog(`${player.name} escapou da masmorra!`);
    this.startCountdownIfNeeded(player);

    this.checkGameEnd();
    if (this.state.phase !== "ended") {
      this.advanceTurn();
    }
  }

  /** Compra um item do Mercado (Chave-mestra, Mochila ou Coroa) pagando Gold — só numa sala de Mercado. */
  buyMarketItem(playerId: string, item: "key" | "backpack" | "crown") {
    const player = this.requireCurrentPlayer(playerId);
    const room = BOARD.rooms[player.roomId];
    if (!room?.isMarket) {
      throw new Error(`Precisa estar numa sala de Mercado pra comprar (está em ${room?.name ?? player.roomId}).`);
    }
    if (player.gold < MARKET_ITEM_COST) {
      throw new Error(`Gold insuficiente pra comprar no Mercado (precisa ${MARKET_ITEM_COST}, tem ${player.gold}).`);
    }

    if (item === "key") {
      if (!this.state.market.masterKeyAvailable) throw new Error("A Chave-mestra já foi comprada.");
      player.gold -= MARKET_ITEM_COST;
      player.hasMasterKey = true;
      this.state.market.masterKeyAvailable = false;
      this.pushLog(`${player.name} comprou a Chave-mestra.`);
      return;
    }

    if (item === "backpack") {
      if (!this.state.market.backpackAvailable) throw new Error("A Mochila já foi comprada.");
      player.gold -= MARKET_ITEM_COST;
      player.hasBackpack = true;
      this.state.market.backpackAvailable = false;
      this.pushLog(`${player.name} comprou a Mochila.`);
      return;
    }

    const value = this.state.market.crownsAvailable[0];
    if (value === undefined) throw new Error("Não há mais coroas disponíveis.");
    player.gold -= MARKET_ITEM_COST;
    player.points += value;
    this.state.market.crownsAvailable.shift();
    this.pushLog(`${player.name} comprou uma coroa (${value} pontos).`);
  }

  /**
   * Pega o artefato da sala atual (se houver e ainda não tiver sido pego). Avança a
   * Trilha de Fúria em exatamente 1 casa — CONFIRMADO no manual oficial ("advance the
   * Dragon marker **one space** along the Rage Track"), independente do valor do
   * artefato. (Ontem eu tinha implementado errado, em camadas por tamanho — isso não
   * existe; o que a foto mostrava com os números 2/3/4 era outra coisa, ver
   * `processCountdownStep`.)
   *
   * Limite de carga: normalmente só dá pra carregar 1 Artefato por vez (2 com a
   * Mochila) — regra oficial. Aqui os pontos continuam sendo banked na hora do jeito
   * que já funcionava (não modelo "largar" um artefato se for nocauteado, isso não é
   * uma regra confirmada); o limite só trava pegar um artefato A MAIS enquanto já
   * estiver no teto.
   */
  takeArtifact(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const room = BOARD.rooms[player.roomId];
    if (!room?.artifactValue) throw new Error(`${room?.name ?? player.roomId} não tem artefato.`);
    if (this.state.claimedArtifacts[room.id]) throw new Error(`O artefato de ${room.name} já foi pego.`);

    const limit = player.hasBackpack ? 2 : 1;
    if (player.artifactsCarried >= limit) {
      throw new Error(
        `${player.name} já está carregando o máximo de artefatos (${limit})` +
          (player.hasBackpack ? "." : " — compre a Mochila no Mercado pra carregar 2."),
      );
    }

    this.state.claimedArtifacts[room.id] = true;
    player.points += room.artifactValue;
    player.artifactsCarried += 1;
    this.state.dragon.rageTrackPosition += 1;
    this.pushLog(`${player.name} pegou um artefato (${room.artifactValue} pontos) em ${room.name}! O dragão está mais irritado.`);
  }

  /**
   * PERIGO (Danger) — CONFIRMADO no manual oficial: cada carta com esse marcador
   * presente na Dungeon Row soma +1 cubo extra em TODO ataque do dragão, enquanto
   * ficar lá sem ser adquirida/vencida. Reserva não conta (regra é só "in the Dungeon Row").
   */
  private countDangerCards(): number {
    return this.state.dungeonRow.slots.filter((id) => id && getCard(id).isDanger).length;
  }

  /**
   * Pega um Ídolo de Macaco da sala atual (RESOLVIDO 2026-07-24 — ver nota no topo do
   * board.ts). São 3 tokens únicos no jogo todo (Macaco Surdo/Cego/Mudo), cada um vale
   * `MONKEY_IDOL_VALUE` pontos, banked na hora igual artefato/coroa. Sem limite de
   * quantidade carregada (regra oficial não menciona limite, diferente de Artefato).
   */
  takeMonkeyIdol(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    const room = BOARD.rooms[player.roomId];
    const available = (room?.monkeyIdolNames ?? []).find((name) => !this.state.claimedMonkeyIdols[name]);
    if (!available) {
      throw new Error(`${room?.name ?? player.roomId} não tem Ídolo de Macaco disponível.`);
    }

    this.state.claimedMonkeyIdols[available] = true;
    player.monkeyIdolsHeld.push(available);
    player.points += MONKEY_IDOL_VALUE;
    this.pushLog(`${player.name} pegou o Ídolo de Macaco "${available}" (${MONKEY_IDOL_VALUE} pontos)!`);
  }

  /**
   * Ataque do dragão: sorteia cubos do saco (jogadores + cubos pretos neutros) em
   * quantidade igual à posição atual na Trilha de Fúria menos 1 (regra confirmada:
   * "5ª casa da trilha sorteia 4 cubos"), mais `extraCubes` (usado pela Trilha de
   * Contagem Regressiva — ver `processCountdownStep`) e +1 por carta com PERIGO
   * atualmente na Dungeon Row. Cubo de um jogador = 1 dano.
   */
  private triggerDragonAttack(extraCubes = 0) {
    const drawCount =
      Math.max(0, this.state.dragon.rageTrackPosition - 1) + extraCubes + this.countDangerCards();
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

    this.checkGameEnd();
  }

  /**
   * Turno do jogador que está andando na Trilha de Contagem Regressiva (regra oficial:
   * "on that player's next turn, instead of taking a normal turn..."). Casas 2-4 causam
   * um ataque instantâneo do dragão com cubos extras (+1/+2/+3); a casa 5 nocauteia na
   * hora todo mundo que ainda está na masmorra.
   */
  private processCountdownStep(player: PlayerState) {
    this.state.countdownTrack += 1;
    const space = this.state.countdownTrack;
    if (space >= 2 && space <= 4) {
      const extraCubes = space - 1;
      this.pushLog(
        `${player.name} anda na Trilha de Contagem Regressiva pra casa ${space}/${COUNTDOWN_TRACK_SIZE} — ataque instantâneo do dragão (+${extraCubes} cubo(s) extra)!`,
      );
      this.triggerDragonAttack(extraCubes);
    } else if (space >= COUNTDOWN_TRACK_SIZE) {
      for (const p of this.state.players) {
        if (!p.knockedOut && !p.hasLeftDungeon) this.damagePlayer(p, HEALTH_TRACK_SIZE);
      }
      this.pushLog("A Trilha de Contagem Regressiva chegou ao fim — o dragão acordou de vez! Quem ainda estava na masmorra foi nocauteado.");
    }
    this.checkGameEnd();
  }

  /** A partida termina quando todo mundo saiu da masmorra ou foi nocauteado. */
  private checkGameEnd() {
    if (this.state.phase === "ended") return;
    const allDone = this.state.players.every((p) => p.knockedOut || p.hasLeftDungeon);
    if (!allDone) return;

    this.state.phase = "ended";
    const scores = this.computeFinalScores();
    this.state.finalScores = scores;

    const [winnerId, winnerScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
    const winner = this.state.players.find((p) => p.id === winnerId);
    this.pushLog(
      winner ? `A partida terminou! ${winner.name} venceu com ${winnerScore} pontos.` : "A partida terminou.",
    );
  }

  /**
   * Pontuação final = pontos de artefatos/coroas + Gold + valor das cartas no baralho
   * + bônus de Mastery. Regra oficial: nocauteado sem nenhum artefato (nem coroa) =
   * eliminado, pontua 0; nocauteado COM artefato = "resgatado", pontua normalmente. Uso
   * `points === 0` como proxy de "sem artefato/coroa" (é a única fonte desses pontos
   * hoje no motor).
   *
   * Mastery (CONFIRMADO): "If you make it all the way back [outside, à Entrada] before
   * being knocked out, you will receive a Mastery token worth an additional 20 points."
   * — só quem escapou de verdade (`hasLeftDungeon`, o que já implica não ter sido
   * nocauteado, já que `leaveDungeon` exige estar jogando) E está carregando pelo menos
   * 1 artefato ganha o bônus.
   */
  private computeFinalScores(): Record<string, number> {
    const MASTERY_BONUS = 20;
    const scores: Record<string, number> = {};
    for (const player of this.state.players) {
      const eliminated = player.knockedOut && player.points === 0;
      if (eliminated) {
        scores[player.id] = 0;
        continue;
      }
      const deckCardIds = [...player.hand, ...player.drawPile, ...player.discardPile, ...player.playedThisTurn];
      const cardPoints = deckCardIds.reduce((sum, id) => sum + (getCard(id).points ?? 0), 0);
      const masteryBonus = player.hasLeftDungeon && player.artifactsCarried > 0 ? MASTERY_BONUS : 0;
      scores[player.id] = player.points + player.gold + cardPoints + masteryBonus;
    }
    return scores;
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
    this.applyEffectsOrSetChoice(player, card, card.playEffects, card.playChoices);
    this.applyRoomConditionalEffects(player, cardId);
  }

  /**
   * Bônus condicionais ligados à sala atual do jogador — texto oficial não representável
   * em `CardEffects` genéricos (ver comentários "condicional não modelado" em cards.ts).
   * ⚠️ Nenhuma carta do jogo base (revertido em 2026-07-24) tem confirmado um bônus
   * desse tipo ainda (a versão anterior, do Catacombs, tinha "Lie in Wait" — removida
   * junto com o resto do conteúdo do Catacombs). Método mantido como gancho genérico
   * pra quando/se alguma carta do jogo base precisar disso.
   */
  private applyRoomConditionalEffects(_player: PlayerState, _cardId: string) {
    // Nenhuma condicional de sala confirmada pro jogo base ainda — ver comentário acima.
  }

  /**
   * Compra uma carta da Dungeon Row pagando Skill. Devices são regra especial: dão o
   * efeito de "USE" na hora e vão pro descarte da MASMORRA (não entram no baralho do
   * jogador, regra oficial: "do not become part of your deck"); as demais vão pro
   * descarte do jogador normalmente.
   */
  acquireCard(playerId: string, slotIndex: number) {
    const player = this.requireCurrentPlayer(playerId);
    const cardId = this.state.dungeonRow.slots[slotIndex];
    if (!cardId) throw new Error(`Posição ${slotIndex} da Dungeon Row está vazia.`);

    const card = getCard(cardId);
    if (card.kind === "monster") throw new Error(`${card.nomePt} é um monstro — use fightMonster.`);
    this.checkRoomRequirement(player, card);
    const cost = card.skillCost ?? 0;
    if (player.resources.skill < cost) {
      throw new Error(`Skill insuficiente pra comprar ${card.nomePt} (precisa ${cost}, tem ${player.resources.skill}).`);
    }

    player.resources.skill -= cost;
    if (card.kind === "device") {
      this.state.dungeonRow.discardPile.push(cardId);
    } else {
      player.discardPile.push(cardId);
    }
    this.applyEffectsOrSetChoice(player, card, card.acquireEffects, card.acquireChoices);
    this.refillDungeonSlot(slotIndex);
  }

  /** Luta um monstro na Dungeon Row pagando Swords — vai pro descarte da masmorra, não pro baralho do jogador. */
  fightMonster(playerId: string, slotIndex: number) {
    const player = this.requireCurrentPlayer(playerId);
    const cardId = this.state.dungeonRow.slots[slotIndex];
    if (!cardId) throw new Error(`Posição ${slotIndex} da Dungeon Row está vazia.`);

    const card = getCard(cardId);
    if (card.kind !== "monster") throw new Error(`${card.nomePt} não é um monstro — use acquireCard.`);
    this.checkRoomRequirement(player, card);
    const cost = card.swordCost ?? 0;
    if (player.resources.swords < cost) {
      throw new Error(`Swords insuficientes pra vencer ${card.nomePt} (precisa ${cost}, tem ${player.resources.swords}).`);
    }

    player.resources.swords -= cost;
    this.state.dungeonRow.discardPile.push(cardId);
    this.applyEffectsOrSetChoice(player, card, card.acquireEffects, card.acquireChoices);
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
    if (remaining <= 0) throw new Error(`${card.nomePt} esgotou na Reserva.`);
    this.checkRoomRequirement(player, card);

    if (card.kind === "monster") {
      const cost = card.swordCost ?? 0;
      if (player.resources.swords < cost) {
        throw new Error(`Swords insuficientes pra vencer ${card.nomePt} (precisa ${cost}, tem ${player.resources.swords}).`);
      }
      player.resources.swords -= cost;
      this.applyEffectsOrSetChoice(player, card, card.acquireEffects, card.acquireChoices);
      if (!RESERVE_INFINITE.has(cardId)) {
        this.state.reserve.remaining[cardId] = remaining - 1;
      }
      return;
    }

    const cost = card.skillCost ?? 0;
    if (player.resources.skill < cost) {
      throw new Error(`Skill insuficiente pra comprar ${card.nomePt} (precisa ${cost}, tem ${player.resources.skill}).`);
    }
    player.resources.skill -= cost;
    player.discardPile.push(cardId);
    this.applyEffectsOrSetChoice(player, card, card.acquireEffects, card.acquireChoices);
    this.state.reserve.remaining[cardId] = remaining - 1;
  }

  /**
   * ARRIVE — CONFIRMADO no manual oficial: efeito aplicado a TODOS os jogadores quando a
   * carta é revelada pra repor a Dungeon Row, executado ANTES de qualquer Dragon Attack
   * disparado pela mesma reposição (ver `refillDungeonSlot`). Ex: Watcher/Overlord/
   * Archoverlord dão "+1 Clank!" a todos ao serem revelados.
   */
  private applyArriveEffects(card: CardDefinition) {
    if (!card.arriveEffects) return;
    for (const player of this.state.players) {
      this.applyEffects(player, card.arriveEffects);
    }
    this.pushLog(`${card.nomePt} foi revelada na Dungeon Row — efeito de chegada aplicado a todos os jogadores.`);
  }

  private refillDungeonSlot(slotIndex: number) {
    const row = this.state.dungeonRow;
    if (row.drawPile.length === 0 && row.discardPile.length > 0) {
      row.drawPile = shuffle(row.discardPile, this.rng);
      row.discardPile = [];
    }
    const newCardId = row.drawPile.shift() ?? null;
    row.slots[slotIndex] = newCardId;
    if (newCardId) {
      const card = getCard(newCardId);
      this.applyArriveEffects(card);
      if (card.triggersDragonAttack) {
        this.triggerDragonAttack();
      }
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
      const candidate = this.state.players[next];
      if (candidate.id === this.state.countdownPlayerId) {
        this.processCountdownStep(candidate);
        if (this.state.phase === "ended") return;
        continue;
      }
      if (!candidate.knockedOut && !candidate.hasLeftDungeon) break;
    }
    this.state.currentPlayerIndex = next;
    this.state.turnNumber += 1;
  }
}

export { HAND_SIZE };
