import {
  buildDungeonDeck,
  getCard,
  MAJOR_SECRETS_REFERENCE,
  MINOR_SECRETS_REFERENCE,
  RESERVE_INFINITE,
  RESERVE_STARTING_COUNTS,
} from "./cards.js";
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
  PendingTeleport,
  PlayerState,
  ReserveState,
  RoomDefinition,
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
 * Trilha de Fúria — CONFIRMADO pelo usuário (playtest do jogo físico, 2026-07-28), 7
 * casas: quantos cubos cada ataque do dragão sorteia, por casa (índice 0 = casa 1).
 * Substituiu a fórmula antiga (`posição - 1`), que só batia por coincidência na casa 5
 * — o único ponto que eu tinha confirmado antes ("5ª casa sorteia 4 cubos").
 */
export const RAGE_TRACK_CUBES = [2, 2, 3, 3, 4, 4, 5];
const RAGE_TRACK_SIZE = RAGE_TRACK_CUBES.length;

/**
 * Casa inicial da Trilha de Fúria por número de jogadores — CONFIRMADO no manual
 * oficial ("Place the Dragon marker... 4-player: first space. 3-player: second space.
 * 2-player: third space."). 1 jogador (solo) não é modo oficial — usa a mesma casa de
 * 2 jogadores como aproximação razoável.
 */
function startingRageTrackPosition(playerCount: number): number {
  if (playerCount >= 4) return 1;
  if (playerCount === 3) return 2;
  return 3; // 2 jogadores (ou 1, solo — aproximação)
}
/** Quantidade de cubos "pretos" (neutros) no saco do dragão — CONFIRMADO no manual oficial ("24 Dragon Cubes"). */
export const BLACK_CUBE_COUNT = 24;

/**
 * Clank! inicial na Área de Clank de cada jogador, por ordem de turno — CONFIRMADO no
 * manual oficial: "The first player places 3 Clank! cubes... The second player places
 * 2 Clank!... The third and fourth players (if there are any) place 1 Clank! and 0
 * Clank!, respectively." Compensa quem joga depois no primeiro turno ter menos chance
 * de ter Clank! acumulado antes do primeiro ataque do dragão.
 */
const STARTING_CLANK_BY_POSITION = [3, 2, 1, 0];

/**
 * Monta a Dungeon Row inicial (6 cartas) — CONFIRMADO no manual oficial: "If any of
 * those cards have the Dragon Attack symbol..., replace them with other cards until
 * none of them show the symbol, then shuffle any replaced cards back into the Dungeon
 * Deck." Sem isso, a primeira reposição do turno 1 podia disparar um ataque do dragão
 * antes de qualquer jogador ter feito Clank! algum.
 */
function dealInitialDungeonRow(shuffledDeck: string[], rng: Rng): { slots: (string | null)[]; drawPile: string[] } {
  const remaining = [...shuffledDeck];
  const slots: string[] = [];
  const replaced: string[] = [];
  while (slots.length < DUNGEON_ROW_SIZE && remaining.length > 0) {
    const cardId = remaining.shift()!;
    if (getCard(cardId).triggersDragonAttack) {
      replaced.push(cardId);
    } else {
      slots.push(cardId);
    }
  }
  const drawPile = replaced.length > 0 ? shuffle([...remaining, ...replaced], rng) : remaining;
  const paddedSlots: (string | null)[] = [...slots];
  while (paddedSlots.length < DUNGEON_ROW_SIZE) paddedSlots.push(null); // nunca deveria faltar carta, mas não trava se faltar
  return { slots: paddedSlots, drawPile };
}

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
  /**
   * Quantos Segredos já foram pegos em cada sala (por id de sala) — comparado contra
   * `room.majorSecret` (1) ou `room.minorSecrets` (N) pra saber se ainda sobra algum
   * (ver `tryAutoClaimSecret`). Ao contrário de Ídolo de Macaco, Segredos não têm nome
   * único global — cada sala tem sua própria contagem independente.
   */
  claimedSecrets: Record<string, number>;
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
  /**
   * Teleporte pendente (ex: Teleporter, Invoker of the Ancients) — igual ao
   * `pendingChoice`, bloqueia qualquer outra ação até o jogador chamar `teleportTo`.
   */
  pendingTeleport: PendingTeleport | null;
}

export class GameEngine {
  state: GameState;
  private rng: Rng;

  constructor(playerInfos: { id: string; name: string }[], rng: Rng = Math.random) {
    if (playerInfos.length < 1) throw new Error("Precisa de ao menos 1 jogador.");
    this.rng = rng;

    const players = playerInfos.map((p) => createPlayer(p.id, p.name, rng));
    // CONFIRMADO no manual oficial: "The first player places 3 Clank! cubes... The
    // second player places 2 Clank!... The third and fourth players (if there are any)
    // place 1 Clank! and 0 Clank!, respectively." — compensa quem joga depois ter mais
    // chance de gerar Clank! coletivo antes do primeiro ataque do dragão.
    players.forEach((p, i) => {
      p.clank = Math.max(0, STARTING_CLANK_BY_POSITION[i] ?? 0);
    });

    const shuffledDeck = shuffle(buildDungeonDeck(), rng);
    const { slots, drawPile: dungeonDeck } = dealInitialDungeonRow(shuffledDeck, rng);

    this.state = {
      players: players.map((p) => drawHand(p, rng)),
      currentPlayerIndex: 0,
      dungeonRow: { slots, drawPile: dungeonDeck, discardPile: [] },
      reserve: { remaining: { ...RESERVE_STARTING_COUNTS } },
      dragon: { rageTrackPosition: startingRageTrackPosition(playerInfos.length), blackCubesInBag: BLACK_CUBE_COUNT },
      market: { masterKeyAvailable: true, backpackAvailable: true, crownsAvailable: [...CROWN_VALUES] },
      claimedArtifacts: {},
      claimedMonkeyIdols: {},
      claimedSecrets: {},
      turnNumber: 1,
      phase: "playing",
      log: [],
      countdownTrack: 0,
      countdownPlayerId: null,
      pendingChoice: null,
      pendingTeleport: null,
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
    if (this.state.pendingTeleport) {
      throw new Error(
        `${player.name} tem um teleporte pendente ("${this.state.pendingTeleport.cardName}") — resolva com teleportTo antes de continuar.`,
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

  /**
   * Chamado logo depois de aplicar os efeitos normais de uma carta (jogar/adquirir/
   * vencer) — se ela conceder Teleporte (ver `CardDefinition.grantsTeleport`), cria um
   * `PendingTeleport` em vez de mover na hora (o jogador escolhe a sala com
   * `teleportTo`). Também cobre o caso condicional de Wand of Recall ("se você possuir
   * um artefato, teleporte") como caso especial, já que não é um `grantsTeleport`
   * incondicional genérico.
   */
  private maybeGrantTeleport(player: PlayerState, card: CardDefinition) {
    if (this.state.pendingChoice) return;
    const grants = card.grantsTeleport || (card.id === "wand-of-recall" && player.artifactsCarried > 0);
    if (!grants) return;
    this.state.pendingTeleport = { cardId: card.id, cardName: card.nomePt };
  }

  /**
   * Resolve um Teleporte pendente (ver `PendingTeleport`) — move o jogador pra uma sala
   * ADJACENTE (mesmo grafo de túneis de `movePlayer`), mas ignorando custo de Boots/
   * monstro/cadeado (CONFIRMADO no texto oficial de todas as cartas de Teleporte:
   * "teleport to an adjacent room", sem nenhuma menção a pagar custo de túnel). Aplica
   * os mesmos efeitos de ENTRAR na sala de destino que `movePlayer` (ver
   * `applyRoomEntryEffects`). Não passa pelo guard normal de `requireCurrentPlayer` de
   * propósito, igual a `resolveChoice`.
   */
  teleportTo(playerId: string, toRoomId: string) {
    if (this.state.phase === "ended") throw new Error("A partida já terminou.");
    const player = this.currentPlayer;
    if (player.id !== playerId) {
      throw new Error(`Não é a vez de ${playerId} — é a vez de ${player.name}.`);
    }
    const pending = this.state.pendingTeleport;
    if (!pending) throw new Error("Não há teleporte pendente.");
    const room = BOARD.rooms[player.roomId];
    const tunnel = room?.tunnels.find((t) => t.to === toRoomId);
    if (!tunnel) throw new Error(`${toRoomId} não é adjacente a ${room?.name ?? player.roomId}.`);

    player.roomId = toRoomId;
    const destRoom = BOARD.rooms[toRoomId];
    this.applyRoomEntryEffects(player, destRoom);
    this.pushLog(`${player.name} teleportou para ${destRoom?.name ?? toRoomId} usando ${pending.cardName}.`);
    this.state.pendingTeleport = null;
    this.checkGameEnd();
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
   * restantes — não dá mais pra mover de novo neste turno (só via Teleporte, que
   * ignora custo de Boots — ver `teleportTo`).
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
    this.applyRoomEntryEffects(player, BOARD.rooms[toRoomId]);
    this.checkGameEnd();
  }

  /**
   * Efeitos de ENTRAR numa sala — compartilhado entre `movePlayer` (andando por túnel)
   * e `teleportTo` (Teleporte), já que ambos colocam o jogador numa sala nova e os
   * efeitos de chegada (Fonte de Cura, Caverna de Cristal, Ídolo de Macaco) valem nos
   * dois casos igualmente (CONFIRMADO no manual oficial — nenhum efeito de sala menciona
   * "só ao andar", são sempre "ao entrar").
   */
  private applyRoomEntryEffects(player: PlayerState, destRoom: RoomDefinition | undefined) {
    if (destRoom?.isFountainOfHealing && player.damage > 0) {
      player.damage = Math.max(0, player.damage - 1);
      this.pushLog(`${player.name} entrou numa Fonte de Cura: -1 dano.`);
    }
    if (destRoom?.isCrystalCave && player.resources.boots > 0) {
      player.resources.boots = 0;
      this.pushLog(`${player.name} entrou numa Caverna de Cristal e ficou exausto — sem mais Boots este turno.`);
    }
    this.tryAutoClaimMonkeyIdol(player, destRoom);
    this.tryAutoClaimSecret(player, destRoom);
  }

  /**
   * Ídolo de Macaco — CONFIRMADO pelo usuário via playtest do jogo físico (2026-07-28):
   * é automático ao entrar na sala (não uma ação manual separada), e só 1 por entrada
   * mesmo que a sala tenha mais de um ídolo ainda disponível (regra genérica confirmada
   * no manual pra qualquer token de sala: "só 1 por entrada, precisa sair e reentrar pra
   * pegar outro"). Antes disso era um botão manual sem esse limite — dava pra clicar
   * repetidamente na mesma visita e pegar os 3 de uma vez.
   */
  private tryAutoClaimMonkeyIdol(player: PlayerState, room: RoomDefinition | undefined) {
    const available = (room?.monkeyIdolNames ?? []).find((name) => !this.state.claimedMonkeyIdols[name]);
    if (!available) return;
    this.state.claimedMonkeyIdols[available] = true;
    player.monkeyIdolsHeld.push(available);
    player.points += MONKEY_IDOL_VALUE;
    this.pushLog(`${player.name} pegou o Ídolo de Macaco "${available}" (${MONKEY_IDOL_VALUE} pontos) ao entrar na sala!`);
  }

  /**
   * Segredo (Maior ou Menor) — mesmo padrão de "1 por entrada" do Ídolo de Macaco (ver
   * `tryAutoClaimMonkeyIdol`): `room.majorSecret`/`room.minorSecrets` definem quantos
   * Segredos aquela sala tem no total; `claimedSecrets[room.id]` conta quantos já
   * saíram dali. Sorteia aleatoriamente do pool certo (Maior ou Menor) e aplica o
   * efeito na hora — ver `SecretDefinition` pro porquê dos efeitos "guarda até usar"
   * terem sido simplificados pra imediato.
   */
  private tryAutoClaimSecret(player: PlayerState, room: RoomDefinition | undefined) {
    if (!room) return;
    const total = room.majorSecret ? 1 : room.minorSecrets ?? 0;
    if (total <= 0) return;
    const claimedSoFar = this.state.claimedSecrets[room.id] ?? 0;
    if (claimedSoFar >= total) return;
    this.state.claimedSecrets[room.id] = claimedSoFar + 1;

    const pool = room.majorSecret ? MAJOR_SECRETS_REFERENCE : MINOR_SECRETS_REFERENCE;
    const secret = pool[Math.floor(this.rng() * pool.length)];
    if (secret.cardEffects) this.applyEffects(player, secret.cardEffects);
    if (secret.points) player.points += secret.points;
    if (secret.advancesRageTrack) {
      this.state.dragon.rageTrackPosition = Math.min(RAGE_TRACK_SIZE, this.state.dragon.rageTrackPosition + 1);
    }
    this.pushLog(
      `${player.name} encontrou um Segredo ${room.majorSecret ? "Maior" : "Menor"} (${secret.nomePt}): ${secret.effect}`,
    );
  }

  /**
   * Sai da masmorra pela Entrada — fica fora de jogo pro resto da partida. Se for a
   * primeira pessoa a sair, começa a Trilha de Contagem Regressiva (ver triggerDragonAttack).
   * Encerra o turno automaticamente (não tem mais o que fazer depois de sair).
   *
   * CONFIRMADO pelo usuário via playtest do jogo físico (2026-07-28): só pode sair
   * carregando pelo menos 1 Artefato — de mãos vazias, o jogador é obrigado a
   * continuar na masmorra (voltar mais fundo ou arriscar ficar até ser nocauteado).
   * Como não existe mecanismo pra "largar" um Artefato, e ninguém sai sem um, o bônus
   * de Mastery (ver `computeFinalScores`) passa a valer pra TODO mundo que sai por
   * aqui — antes disso, dava pra sair sem nada e só não ganhar o bônus.
   */
  leaveDungeon(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    if (player.roomId !== BOARD.entranceRoomId) {
      throw new Error(`Só dá pra sair da masmorra pela ${BOARD.rooms[BOARD.entranceRoomId].name}.`);
    }
    if (player.artifactsCarried <= 0) {
      throw new Error(`Só dá pra sair da masmorra carregando pelo menos 1 Artefato.`);
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
    this.state.dragon.rageTrackPosition = Math.min(RAGE_TRACK_SIZE, this.state.dragon.rageTrackPosition + 1);
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
   * Ataque do dragão: sorteia cubos do saco (jogadores + cubos pretos neutros) em
   * quantidade dada por `RAGE_TRACK_CUBES[posição - 1]` — CONFIRMADO pelo usuário via
   * playtest do jogo físico (2026-07-28): tabela de 7 casas (2,2,3,3,4,4,5), não a
   * fórmula linear "posição - 1" que eu tinha antes (essa só batia por coincidência na
   * casa 5). Soma `extraCubes` (usado pela Trilha de Contagem Regressiva — ver
   * `processCountdownStep`) e +1 por carta com PERIGO atualmente na Dungeon Row. Cubo
   * de um jogador = 1 dano.
   *
   * Cubos pretos — CONFIRMADO pelo usuário (2026-07-28): vêm de um saco PERSISTENTE
   * (`dragon.blackCubesInBag`), não recriado a cada ataque. Um cubo preto sorteado sai
   * do saco de vez (só volta via `CardDefinition.returnsDragonCubes`, ex: Shrine) — a
   * partida fica mais perigosa com o tempo conforme esse número cai. Cubo de JOGADOR
   * sorteado, por outro lado, volta a ficar disponível assim que ele gerar mais Clank!
   * de novo (por isso não precisa de um pool separado pra eles — `player.clank` já É
   * a contagem "disponível pro saco" a cada ataque).
   */
  private triggerDragonAttack(extraCubes = 0) {
    const position = this.state.dragon.rageTrackPosition;
    const baseCubes = RAGE_TRACK_CUBES[Math.min(RAGE_TRACK_SIZE, Math.max(1, position)) - 1] ?? 0;
    const drawCount = baseCubes + extraCubes + this.countDangerCards();
    if (drawCount === 0) return;

    const tickets: (string | null)[] = [];
    for (const player of this.state.players) {
      for (let i = 0; i < player.clank; i++) tickets.push(player.id);
    }
    for (let i = 0; i < this.state.dragon.blackCubesInBag; i++) tickets.push(null);

    let blackDrawn = 0;
    const damagedNames: string[] = [];
    for (let i = 0; i < drawCount && tickets.length > 0; i++) {
      const idx = Math.floor(this.rng() * tickets.length);
      const [drawnId] = tickets.splice(idx, 1);
      if (drawnId === null) {
        blackDrawn++;
        this.state.dragon.blackCubesInBag -= 1;
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
    // CONFIRMADO pelo usuário via playtest: precisa dar pra acompanhar o que os outros
    // jogadores estão fazendo (carta jogada, recursos ganhos), não só o resultado final.
    this.pushLog(`${player.name} jogou ${card.nomePt}.`);
    this.applyEffectsOrSetChoice(player, card, card.playEffects, card.playChoices);
    this.maybeGrantTeleport(player, card);
    this.applyRoomConditionalEffects(player, cardId);
  }

  /**
   * Joga TODAS as cartas da mão, na ordem, numa única operação atômica — pedido do
   * usuário via playtest (2026-07-28), "botão pra usar todas as cartas de uma vez".
   * UMA chamada só em vez do client mandar `playCard` várias vezes em sequência evita
   * N round-trips desnecessários pro servidor (a causa raiz do bug de "cartas fantasma"
   * era outra — ver comentário no client em `GameScreen.tsx` sobre o AnimatePresence —
   * mas continuar atômico aqui ainda é a escolha certa por simplicidade e performance).
   * Para automaticamente (sem erro) se alguma carta gerar uma escolha pendente ou um
   * Teleporte pendente — não dá pra continuar jogando até isso ser resolvido.
   */
  playAllCards(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    while (player.hand.length > 0 && !this.state.pendingChoice && !this.state.pendingTeleport) {
      this.playCard(playerId, player.hand[0]);
    }
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
    this.pushLog(`${player.name} comprou ${card.nomePt} da Dungeon Row.`);
    this.applyEffectsOrSetChoice(player, card, card.acquireEffects, card.acquireChoices);
    this.maybeGrantTeleport(player, card);
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
    this.pushLog(`${player.name} derrotou ${card.nomePt} na Dungeon Row.`);
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
      this.pushLog(`${player.name} derrotou ${card.nomePt} na Reserva.`);
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
    this.pushLog(`${player.name} comprou ${card.nomePt} da Reserva.`);
    this.applyEffectsOrSetChoice(player, card, card.acquireEffects, card.acquireChoices);
    this.maybeGrantTeleport(player, card);
    this.state.reserve.remaining[cardId] = remaining - 1;
  }

  /**
   * ARRIVE — CONFIRMADO no manual oficial: efeito aplicado a TODOS os jogadores quando a
   * carta é revelada pra repor a Dungeon Row, executado ANTES de qualquer Dragon Attack
   * disparado pela mesma reposição (ver `refillDungeonSlot`). Ex: Watcher/Overlord/
   * Archoverlord dão "+1 Clank!" a todos ao serem revelados.
   */
  private applyArriveEffects(card: CardDefinition) {
    if (card.arriveEffects) {
      for (const player of this.state.players) {
        this.applyEffects(player, card.arriveEffects);
      }
      this.pushLog(`${card.nomePt} foi revelada na Dungeon Row — efeito de chegada aplicado a todos os jogadores.`);
    }
    if (card.returnsDragonCubes) {
      const before = this.state.dragon.blackCubesInBag;
      this.state.dragon.blackCubesInBag = Math.min(BLACK_CUBE_COUNT, before + card.returnsDragonCubes);
      const returned = this.state.dragon.blackCubesInBag - before;
      if (returned > 0) {
        this.pushLog(`${card.nomePt} foi revelada — ${returned} cubo(s) preto(s) volta(m) pro saco.`);
      }
    }
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

  /**
   * Descarta cartas jogadas, compra 5 novas, zera recursos do turno e passa a vez.
   *
   * CONFIRMADO no manual oficial (2026-07-28): "You start each of your turns with five
   * cards in your hand, and you'll play them all in any order you choose" + o exemplo
   * de turno completo termina com "Having played all cards in her hand and used all the
   * resources she can, the green player ends her turn" — jogar a mão inteira é parte do
   * turno normal, não uma escolha opcional. Por isso `endTurn` exige mão vazia (use
   * `playCard`/`playAllCards` primeiro).
   */
  endTurn(playerId: string) {
    const player = this.requireCurrentPlayer(playerId);
    if (player.hand.length > 0) {
      throw new Error(`${player.name} precisa jogar todas as cartas da mão antes de terminar o turno.`);
    }

    player.discardPile.push(...player.playedThisTurn);
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
