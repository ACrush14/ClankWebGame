import type { CardDefinition } from "./types.js";

/**
 * Baralho inicial — CONFIRMADO contra fontes sobre o jogo oficial (10 cartas):
 * 6x Burgle (1 skill), 1x Sidestep (1 boot), 1x Scramble (1 skill + 1 boot),
 * 2x Stumble (0 recursos, +1 Clank!).
 */
export const STARTING_DECK: CardDefinition[] = [
  { id: "burgle", name: "Burgle", kind: "starting", playEffects: { skill: 1 }, verified: true },
  { id: "sidestep", name: "Sidestep", kind: "starting", playEffects: { boots: 1 }, verified: true },
  {
    id: "scramble",
    name: "Scramble",
    kind: "starting",
    playEffects: { skill: 1, boots: 1 },
    verified: true,
  },
  { id: "stumble", name: "Stumble", kind: "starting", playEffects: { clank: 1 }, verified: true },
];

export const STARTING_DECK_COUNTS: Record<string, number> = {
  burgle: 6,
  sidestep: 1,
  scramble: 1,
  stumble: 2,
};

export function buildStartingDeck(): string[] {
  const deck: string[] = [];
  for (const [id, count] of Object.entries(STARTING_DECK_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return deck;
}

/**
 * Cartas com `verified: true` — nome E números conferidos contra uma fonte real sobre
 * o jogo (ex: exemplo de jogo do UltraBoardGames citando "Orc Grunt custa 2 Swords,
 * dá 3 Gold"). As demais (`verified: false`) têm nome e mecânica geral reais, mas os
 * NÚMEROS de custo/efeito são estimativas minhas — ver aviso grande abaixo.
 *
 * ⚠️ PLACEHOLDER PARCIAL — a maioria destas cartas ainda não está verificada.
 *
 * Tentei confirmar os valores exatos de ~30 tipos de carta do Dungeon Deck/Reserva
 * contra o manual oficial (o PDF não carregou em nenhum dos 2 hosts que tentei) e
 * contra várias fontes sobre o jogo (BoardGameGeek, UltraBoardGames, Steam, wikis) —
 * consegui confirmar bem menos do que o esperado, porque a maior parte dos valores
 * nesses sites está em ícones de imagem, não em texto. `orc-grunt` é o único monstro
 * 100% verificado até agora; `explore`, `mercenary`, `secret-tome` e `teleporter` são
 * nomes e mecânicas reais com números estimados por mim — troque quando tiver uma
 * fonte confiável (o PDF `Clank! Card List` do BoardGameGeek parece ser exatamente
 * isso, mas exige login pra baixar).
 */
export const DUNGEON_DECK: CardDefinition[] = [
  {
    id: "explore",
    name: "Explore",
    kind: "dungeon",
    skillCost: 3,
    playEffects: { boots: 2, drawCards: 1 },
    verified: false,
  },
  {
    id: "mercenary",
    name: "Mercenary",
    kind: "dungeon",
    skillCost: 2,
    playEffects: { swords: 2 },
    verified: false,
  },
  {
    id: "secret-tome",
    name: "Secret Tome",
    kind: "dungeon",
    skillCost: 5,
    playEffects: { clank: 1 },
    points: 7,
    verified: false,
  },
  {
    id: "teleporter",
    name: "Teleporter",
    kind: "device",
    skillCost: 6,
    playEffects: { boots: 3 },
    verified: false,
  },
  {
    id: "orc-grunt",
    name: "Orc Grunt",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { gold: 3 },
    verified: true,
  },
];

export const DUNGEON_DECK_COUNTS: Record<string, number> = {
  explore: 6,
  mercenary: 5,
  "secret-tome": 3,
  teleporter: 2,
  "orc-grunt": 4,
};

export function buildDungeonDeck(): string[] {
  const deck: string[] = [];
  for (const [id, count] of Object.entries(DUNGEON_DECK_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return deck;
}

export const ALL_CARDS: Record<string, CardDefinition> = Object.fromEntries(
  [...STARTING_DECK, ...DUNGEON_DECK].map((c) => [c.id, c]),
);

export function getCard(id: string): CardDefinition {
  const card = ALL_CARDS[id];
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}
