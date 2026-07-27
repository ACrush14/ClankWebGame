/**
 * Os três recursos reais do turno — Clank! não usa dados em nenhum momento. Zerados a
 * cada início de turno ("recursos não gastos são perdidos"). Gold NÃO é um recurso de
 * turno — é moeda persistente, guardada em `PlayerState.gold` (ver ali o porquê).
 */
export interface Resources {
  skill: number;
  swords: number;
  boots: number;
}

export function emptyResources(): Resources {
  return { skill: 0, swords: 0, boots: 0 };
}

export type CardKind = "starting" | "dungeon" | "monster" | "item" | "device";

/**
 * Efeitos que uma carta concede ao ser jogada (cartas normais) ou ao ser adquirida/vencida
 * (para monstros e alguns devices, o efeito acontece na aquisição, não ao jogar depois).
 */
export interface CardEffects {
  skill?: number;
  swords?: number;
  boots?: number;
  gold?: number;
  /** Clank! (barulho) ganho ao jogar/adquirir esta carta — vai pra Área de Clank do jogador. */
  clank?: number;
  /** Compra cartas extras da mão além das 5 padrão do turno. */
  drawCards?: number;
  /** Cura esse tanto de dano (reduz `damage`, nunca abaixo de 0). CONFIRMADO em várias cartas reais (Apothecary, Shrine, Cleric of the Sun, poções de Segredo). */
  heal?: number;
}

/** Flag de sala que algumas cartas exigem pra serem adquiridas/enfrentadas (ver `CardDefinition.requiresRoomFlag`). */
export type RoomFlag = "isDepths" | "isCrystalCave";

export interface CardDefinition {
  id: string;
  name: string;
  kind: CardKind;
  /** Custo em Skill para adquirir (cartas normais/itens/devices) — undefined se não compra com skill. */
  skillCost?: number;
  /** Custo em Swords para vencer (monstros) — undefined se não é monstro. */
  swordCost?: number;
  /** Efeito ao jogar a carta da mão. */
  playEffects?: CardEffects;
  /** Efeito único ao adquirir/vencer a carta (ex: monstros dão recompensa na hora). */
  acquireEffects?: CardEffects;
  /** Pontos de vitória no fim de jogo (ex: Secret Tome). */
  points?: number;
  /**
   * `true` = nome e valores conferidos contra uma fonte real sobre o jogo oficial.
   * `false`/ausente = valores estimados por mim, ainda não confirmados — ver aviso em cards.ts.
   */
  verified?: boolean;
  /**
   * Se essa carta tem o símbolo de ataque do dragão (aparece quando ela é revelada pra
   * repor a Dungeon Row). ⚠️ Não sei quais das 68 cartas reais têm esse símbolo — uso
   * uma estimativa (monstros e devices) só pra deixar o mecanismo testável. Ver cards.ts.
   */
  triggersDragonAttack?: boolean;
  /**
   * PERIGO (Danger) — CONFIRMADO no manual oficial: enquanto esta carta ficar na Dungeon
   * Row (sem ser adquirida/vencida), TODO ataque do dragão puxa +1 cubo extra do saco.
   * Diferente de `triggersDragonAttack`: aqui o efeito é passivo/persistente, não um
   * disparo único ao ser revelada.
   */
  isDanger?: boolean;
  /**
   * Efeito ao ser revelada pra repor a Dungeon Row — CONFIRMADO no manual oficial,
   * aplicado a TODOS os jogadores (não só ao atual), executado ANTES de qualquer Dragon
   * Attack disparado pela mesma reposição (ordem confirmada: "carried out when the card
   * is revealed, before any Dragon Attack..."). Ex: Watcher/Overlord/Archoverlord dão
   * "+1 Clank!" a todos os jogadores ao serem revelados.
   */
  arriveEffects?: CardEffects;
  /**
   * Restrição de localização pra adquirir (Devices) ou enfrentar (Monstros) esta carta —
   * CONFIRMADO no manual oficial ("Deep" = só nas Profundezas; ex: Crystal Golem/Crystal
   * Kobold = só numa Caverna de Cristal). `fightMonster`/`acquireCard` lançam erro se o
   * jogador não estiver numa sala com essa flag.
   */
  requiresRoomFlag?: RoomFlag;
}

/** Ícones possíveis num túnel — controlam o custo/risco de passar por ele. */
export interface TunnelIcon {
  /** Custo em Swords pra passar sem se ferir; se não pagar, leva 1 dano. */
  monsterSwordCost?: number;
  /** Túnel de pegada — custa 2 Boots em vez de 1. */
  footprint?: boolean;
  /** Cadeado — só passa com a Chave-mestra do Mercado (uso ilimitado depois de comprada). */
  locked?: boolean;
}

export interface Tunnel {
  to: string;
  icon?: TunnelIcon;
}

export interface RoomDefinition {
  id: string;
  name: string;
  tunnels: Tunnel[];
  isEntrance?: boolean;
  isMarket?: boolean;
  isDepths?: boolean;
  /** Caverna de Cristal — CONFIRMADO no manual oficial: ao entrar, esgota os Boots restantes no turno (ver `movePlayer`). */
  isCrystalCave?: boolean;
  /** Fonte de Cura — CONFIRMADO no manual oficial: ao entrar, cura 1 de dano na hora. */
  isFountainOfHealing?: boolean;
  /** Valor em pontos do artefato nesta sala, se ainda não foi pego. */
  artifactValue?: number;
  /** Nome do artefato nesta sala — CONFIRMADO contra fotos oficiais dos 7 artefatos do jogo base (ver ARTIFACT_NAMES_BY_VALUE em board.ts). */
  artifactName?: string;
  /**
   * Nomes dos Ídolos de Macaco disponíveis nesta sala (regra oficial: os 3 ficam juntos
   * na sala "Monkey Shrine", um por vez pode ser pego por entrada na sala). undefined/
   * lista vazia = sem ídolo aqui.
   */
  monkeyIdolNames?: string[];
}

export interface BoardDefinition {
  rooms: Record<string, RoomDefinition>;
  entranceRoomId: string;
}

/** Trilha de Fúria do dragão — a posição controla quantos cubos são sorteados num ataque. */
export interface DragonState {
  rageTrackPosition: number;
}

/**
 * Reserva — pilhas fixas ao lado da Dungeon Row (Goblin/Explore/Mercenary/Secret Tome
 * no jogo base). Diferente da Dungeon Row: não é embaralhada, cada pilha tem sua
 * própria contagem que só diminui (exceto Goblin, que nunca se esgota).
 */
export interface ReserveState {
  remaining: Record<string, number>;
}

/**
 * Mercado — itens comprados com Gold (não com Skill), só numa sala com `isMarket`.
 * CONFIRMADO: custo fixo de 7 Gold por item; coroas valem 10/9/8 pontos (a mais
 * valiosa disponível primeiro).
 */
export const MARKET_ITEM_COST = 7;
export const CROWN_VALUES = [10, 9, 8];

export interface MarketState {
  masterKeyAvailable: boolean;
  backpackAvailable: boolean;
  /** Valores de coroa ainda disponíveis, do maior pro menor. */
  crownsAvailable: number[];
}

/** Tamanho da trilha de vida — CONFIRMADO (10 espaços; enche = nocauteado). */
export const HEALTH_TRACK_SIZE = 10;

/** Tamanho da Trilha de Contagem Regressiva — ⚠️ estimativa (confirmei "5ª casa" como o fim). */
export const COUNTDOWN_TRACK_SIZE = 5;

export interface PlayerState {
  id: string;
  name: string;
  /** Cartas compradas, ainda não embaralhadas na mão (face para baixo). */
  drawPile: string[];
  /** Cartas já usadas neste turno ou compradas, aguardando reembaralhar. */
  discardPile: string[];
  /** Mão atual (até 5 cartas no início do turno). */
  hand: string[];
  /** Cartas jogadas nesta rodada, aguardando ir pro descarte no fim do turno. */
  playedThisTurn: string[];
  /** Recursos acumulados no turno atual — zerados a cada início de turno. */
  resources: Resources;
  /** Clank! (barulho) acumulado na Área de Clank do jogador, ainda não sorteado do saco. */
  clank: number;
  /** Dano sofrido (cubos na trilha de vida) — 0 a HEALTH_TRACK_SIZE. */
  damage: number;
  knockedOut: boolean;
  roomId: string;
  /** Pontos de artefatos e coroas pegos (somados no fim de jogo). */
  points: number;
  /** Quantos artefatos está carregando agora — limite normal é 1 (2 com a Mochila). */
  artifactsCarried: number;
  /** Ouro é moeda persistente (não reseta a cada turno como skill/swords/boots). */
  gold: number;
  hasMasterKey: boolean;
  hasBackpack: boolean;
  /** Já escapou da masmorra pela Entrada (fora de jogo, aguardando o fim da partida). */
  hasLeftDungeon: boolean;
  /** Nomes dos Ídolos de Macaco carregados (cada um vale MONKEY_IDOL_VALUE pontos, já somados em `points` ao pegar). */
  monkeyIdolsHeld: string[];
}

/** Valor em pontos de cada Ídolo de Macaco — CONFIRMADO (3 tokens, 5 pontos cada). */
export const MONKEY_IDOL_VALUE = 5;
