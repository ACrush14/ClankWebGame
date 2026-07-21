/** Os três recursos reais do jogo — Clank! não usa dados em nenhum momento. */
export interface Resources {
  skill: number;
  swords: number;
  boots: number;
  gold: number;
}

export function emptyResources(): Resources {
  return { skill: 0, swords: 0, boots: 0, gold: 0 };
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
}

/**
 * Reserva — pilhas fixas ao lado da Dungeon Row (Goblin/Explore/Mercenary/Secret Tome
 * no jogo base). Diferente da Dungeon Row: não é embaralhada, cada pilha tem sua
 * própria contagem que só diminui (exceto Goblin, que nunca se esgota).
 */
export interface ReserveState {
  remaining: Record<string, number>;
}

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
  knockedOut: boolean;
}
