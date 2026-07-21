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
}

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
  /** Caverna de Cristal — algumas cartas do Catacombs têm efeito condicional aqui (ex: Lie in Wait). */
  isCrystalCave?: boolean;
  /** Valor em pontos do artefato nesta sala, se ainda não foi pego. */
  artifactValue?: number;
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
  /** Ouro é moeda persistente (não reseta a cada turno como skill/swords/boots). */
  gold: number;
  hasMasterKey: boolean;
  hasBackpack: boolean;
  /** Já escapou da masmorra pela Entrada (fora de jogo, aguardando o fim da partida). */
  hasLeftDungeon: boolean;
}
