import type { CardDefinition } from "./types.js";

/**
 * Baralho inicial — CONFIRMADO contra o manual oficial (PDF do rulebook, seção de
 * Componentes e Setup, listado duas vezes): "6 Burgle, 2 Stumble, 1 Cautious Advance,
 * 1 Skillful Move". Os nomes "Sidestep"/"Scramble" que eu tinha antes vieram de fontes
 * secundárias e estavam ERRADOS — o manual oficial usa "Cautious Advance" (1 Boot) e
 * "Skillful Move" (1 Skill + 1 Boot); os efeitos numéricos batem, só o nome mudou.
 */
export const STARTING_DECK: CardDefinition[] = [
  { id: "burgle", name: "Burgle", kind: "starting", playEffects: { skill: 1 }, verified: true },
  {
    id: "cautious-advance",
    name: "Cautious Advance",
    kind: "starting",
    playEffects: { boots: 1 },
    verified: true,
  },
  {
    id: "skillful-move",
    name: "Skillful Move",
    kind: "starting",
    playEffects: { skill: 1, boots: 1 },
    verified: true,
  },
  { id: "stumble", name: "Stumble", kind: "starting", playEffects: { clank: 1 }, verified: true },
];

export const STARTING_DECK_COUNTS: Record<string, number> = {
  burgle: 6,
  "cautious-advance": 1,
  "skillful-move": 1,
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
 * `orc-grunt` e `move-silently` são 100% verificados contra o manual oficial (exemplo de
 * jogo escrito por extenso, com o texto e números exatos das duas cartas). `teleporter`
 * continua ⚠️ PLACEHOLDER — nome e categoria (device) reais, números estimados por mim.
 */
export const DUNGEON_DECK: CardDefinition[] = [
  {
    id: "teleporter",
    name: "Teleporter",
    kind: "device",
    skillCost: 6,
    playEffects: { boots: 3 },
    verified: false,
    triggersDragonAttack: true,
  },
  {
    id: "orc-grunt",
    name: "Orc Grunt",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { gold: 3 },
    verified: true,
    triggersDragonAttack: true,
  },
  {
    id: "move-silently",
    name: "Move Silently",
    kind: "item",
    skillCost: 3,
    playEffects: { boots: 2, clank: -2 },
    verified: true,
  },
];

/**
 * Contagens REAIS (confirmadas no "Clank! Card List" oficial do BGG) do baralho
 * embaralhado de 100 cartas — usadas mesmo pras cartas que ainda não têm efeito
 * implementado (ver DUNGEON_DECK_CATALOG_REFERENCE), pra manter a proporção real
 * do baralho assim que cada carta for implementada.
 */
export const DUNGEON_DECK_COUNTS: Record<string, number> = {
  teleporter: 2,
  "orc-grunt": 3,
  "move-silently": 2,
};

export function buildDungeonDeck(): string[] {
  const deck: string[] = [];
  for (const [id, count] of Object.entries(DUNGEON_DECK_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return deck;
}

/**
 * A Reserva é DIFERENTE do Dungeon Deck: são pilhas fixas ao lado da Dungeon Row,
 * não embaralhadas — o jogador compra a carta do topo de uma pilha específica, e a
 * pilha vai encolhendo (exceto Goblin, que não se esgota: pode ser lutado várias
 * vezes por turno, tem só 1 cópia física que fica ali disponível pra sempre).
 *
 * ⚠️ PLACEHOLDER — nomes e quantidades REAIS (do Clank! Card List oficial), mas
 * custo/efeito ainda são estimativas minhas.
 */
export const RESERVE_CARDS: CardDefinition[] = [
  {
    id: "goblin",
    name: "Goblin",
    kind: "monster",
    swordCost: 1,
    acquireEffects: { gold: 1 },
    verified: false,
  },
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
];

/** Quantidade inicial de cada pilha da Reserva — REAL, do Clank! Card List oficial. */
export const RESERVE_STARTING_COUNTS: Record<string, number> = {
  goblin: 1,
  explore: 15,
  mercenary: 15,
  "secret-tome": 12,
};

/** Goblin nunca se esgota (é lutado repetidamente, não consumido). */
export const RESERVE_INFINITE = new Set(["goblin"]);

export const ALL_CARDS: Record<string, CardDefinition> = Object.fromEntries(
  [...STARTING_DECK, ...DUNGEON_DECK, ...RESERVE_CARDS].map((c) => [c.id, c]),
);

export function getCard(id: string): CardDefinition {
  const card = ALL_CARDS[id];
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}

/**
 * Catálogo de referência — TODOS os 68 tipos de carta únicos do baralho de 100 do
 * jogo base (nome + quantidade impressa), direto do "Clank! Card List" oficial do
 * BoardGameGeek. NÃO estão em `ALL_CARDS`/jogáveis ainda porque não tenho o custo/
 * efeito de cada uma — é só a lista-mestra pra ir preenchendo aos poucos.
 * Devices e Monsters já contam pro total de 100; o resto são itens/companheiros.
 */
export const DUNGEON_DECK_CATALOG_REFERENCE: { name: string; count: number; category: string }[] = [
  // Device Cards (10)
  { name: "Dragon Shrine", count: 2, category: "device" },
  { name: "Ladder", count: 2, category: "device" },
  { name: "Shrine", count: 3, category: "device" },
  { name: "Teleporter", count: 2, category: "device" },
  { name: "Vault, The", count: 1, category: "device" },
  // Monsters (20)
  { name: "Animated Door", count: 2, category: "monster" },
  { name: "Belcher", count: 2, category: "monster" },
  { name: "Cave Troll", count: 1, category: "monster" },
  { name: "Crystal Golem", count: 2, category: "monster" },
  { name: "Kobold", count: 3, category: "monster" },
  { name: "Ogre", count: 2, category: "monster" },
  { name: "Orc Grunt", count: 3, category: "monster" },
  { name: "Overlord", count: 2, category: "monster" },
  { name: "Watcher", count: 3, category: "monster" },
  // Itens / companheiros / eventos (70)
  { name: "Amulet of Vigor", count: 1, category: "item" },
  { name: "Apothecary", count: 1, category: "item" },
  { name: "Archaeologist", count: 2, category: "item" },
  { name: "Boots of Swiftness", count: 1, category: "item" },
  { name: "Bracers of Agility", count: 2, category: "item" },
  { name: "Brilliance", count: 1, category: "item" },
  { name: "Cleric of the Sun", count: 2, category: "item" },
  { name: "Dead Run", count: 2, category: "item" },
  { name: "Diamond", count: 1, category: "item" },
  { name: "Dragon's Eye", count: 1, category: "item" },
  { name: "The Duke", count: 1, category: "item" },
  { name: "Dwarven Peddler", count: 1, category: "item" },
  { name: "Elven Boots", count: 1, category: "item" },
  { name: "Elven Cloak", count: 1, category: "item" },
  { name: "Elven Dagger", count: 1, category: "item" },
  { name: "Emerald", count: 2, category: "item" },
  { name: "Flying Carpet", count: 1, category: "item" },
  { name: "Gem Collector", count: 1, category: "item" },
  { name: "Invoker of the Ancients", count: 1, category: "item" },
  { name: "Kobold Merchant", count: 1, category: "item" },
  { name: "Lucky Coin", count: 2, category: "item" },
  { name: "Master Burglar", count: 2, category: "item" },
  { name: "Mister Whiskers", count: 1, category: "item" },
  // "Move Silently" já está implementada em DUNGEON_DECK (verified: true), removida daqui.
  { name: "Monkey Bot 3000", count: 1, category: "item" },
  { name: "Mountain King, The", count: 1, category: "item" },
  { name: "Pickaxe", count: 2, category: "item" },
  { name: "Queen of Hearts, The", count: 1, category: "item" },
  { name: "Rebel Captain", count: 1, category: "item" },
  { name: "Rebel Miner", count: 1, category: "item" },
  { name: "Rebel Scout", count: 1, category: "item" },
  { name: "Rebel Soldier", count: 1, category: "item" },
  { name: "Ruby", count: 2, category: "item" },
  { name: "Sapphire", count: 3, category: "item" },
  { name: "Scepter of the Ape Lord", count: 1, category: "item" },
  { name: "Search", count: 2, category: "item" },
  { name: "Silver Spear", count: 2, category: "item" },
  { name: "Singing Sword", count: 1, category: "item" },
  { name: "Sleight of Hand", count: 2, category: "item" },
  { name: "Sneak", count: 2, category: "item" },
  { name: "Swagger", count: 2, category: "item" },
  { name: "Tattle", count: 2, category: "item" },
  { name: "Treasure Hunter", count: 2, category: "item" },
  { name: "Treasure Map", count: 1, category: "item" },
  { name: "Tunnel Guide", count: 2, category: "item" },
  { name: "Underworld Dealing", count: 1, category: "item" },
  { name: "Wand of Recall", count: 2, category: "item" },
  { name: "Wand of Wind", count: 1, category: "item" },
  { name: "Wizard", count: 1, category: "item" },
];

/**
 * Secrets — tokens (não cartas) achados dentro das salas do tabuleiro, revelados ao
 * entrar na sala. 100% CONFIRMADOS pelo "Field Reference Guide" do manual oficial.
 * Ainda não implementados no motor (o tabuleiro ainda não modela tokens de sala) —
 * fica documentado aqui pra quando isso for construído.
 */
export const MAJOR_SECRETS_REFERENCE = [
  { name: "Potion of Greater Healing", effect: "Cura 2 de dano (guarda até usar)." },
  { name: "Greater Skill Boost", effect: "Ganha 5 Skill na hora." },
  { name: "Greater Treasure", effect: "Vale 5 Gold." },
  { name: "Flash of Brilliance", effect: "Compra 3 cartas na hora." },
  { name: "Chalice", effect: "Vale 7 pontos no fim de jogo (não é um Artefato)." },
] as const;

export const MINOR_SECRETS_REFERENCE = [
  { name: "Potion of Healing", effect: "Cura 1 de dano (guarda até usar)." },
  { name: "Potion of Swiftness", effect: "Ganha 1 Boot (guarda até usar)." },
  { name: "Potion of Strength", effect: "Ganha 2 Swords (guarda até usar)." },
  { name: "Skill Boost", effect: "Ganha 2 Skill na hora." },
  { name: "Treasure", effect: "Vale 2 Gold." },
  { name: "Magic Spring", effect: "No fim do turno, descarta (trash) uma carta do baralho." },
  { name: "Dragon Egg", effect: "Vale 3 pontos no fim de jogo; avança a Trilha de Fúria em 1." },
] as const;
