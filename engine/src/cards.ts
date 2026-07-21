import type { CardDefinition } from "./types.js";

/**
 * PIVOT (2026-07-21): o conteúdo de cartas deste arquivo vem agora do **Clank! Catacombs**
 * (jogo standalone "irmão" do Clank! básico, mesmo motor — Skill/Swords/Boots, Saco do
 * Dragão, Trilha de Fúria, símbolo de "Dragon Attack" — só que com tema/masmorra/cartas
 * diferentes: masmorra de anões em vez de covil de dragão). Motivo: consegui uma planilha
 * comunitária completa e confiável (nome, custo, Skill/Swords/Boots, VP, texto oficial,
 * tipo, símbolo de Dragon Attack, quantidade) pro Catacombs, e NÃO consegui achar o
 * equivalente pro jogo básico (BoardGameGeek bloqueia scraping e exige login pros PDFs de
 * card list; Scribd também exige login). O board (`board.ts`) e as regras (`game.ts`)
 * continuam genéricos/compartilhados entre os dois jogos — só o catálogo de cartas mudou.
 *
 * Todas as cartas abaixo têm nome/custo/quantidade/símbolo de Dragon Attack 100%
 * conferidos contra essa planilha. O efeito mecânico (`playEffects`/`acquireEffects`) só
 * inclui o que dá pra representar com segurança no modelo atual de `CardEffects`
 * (skill/swords/boots/gold/clank/drawCards) a partir do texto oficial — eu NUNCA adivinho
 * qual branch de um "escolha X" ou de um "se você..." condicional deveria valer. Toda
 * carta guarda o texto oficial completo num comentário `// Texto oficial (...)` logo
 * abaixo da definição, então nada foi perdido — é só questão de, no futuro, estender
 * `CardEffects`/o motor pra cobrir mecânicas específicas do Catacombs que ainda não
 * existem aqui (lockpicks, prisioneiros, ladrilhos/tiles, Wayshrines, fantasmas, etc.).
 */

export const STARTING_DECK: CardDefinition[] = [
  {
    id: "burgle",
    name: "Burgle",
    kind: "starting",
    playEffects: { skill: 1 },
    verified: true,
  },
  {
    id: "scramble",
    name: "Scramble",
    kind: "starting",
    playEffects: { skill: 1, boots: 1 },
    verified: true,
  },
  {
    id: "sidestep",
    name: "Sidestep",
    kind: "starting",
    playEffects: { boots: 1 },
    verified: true,
  },
  {
    id: "stumble",
    name: "Stumble",
    kind: "starting",
    playEffects: { clank: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): +1 Clank!
  },
];

export const STARTING_DECK_COUNTS: Record<string, number> = {
  burgle: 6,
  scramble: 1,
  sidestep: 1,
  stumble: 2,
};

export function buildStartingDeck(): string[] {
  const deck: string[] = [];
  for (const [id, count] of Object.entries(STARTING_DECK_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return deck;
}

/** Monte de masmorra embaralhado — nomes/custos/efeitos diretos/quantidades do Clank! Catacombs (ver nota do topo do arquivo). */
export const DUNGEON_DECK: CardDefinition[] = [
  {
    id: "empurror",
    name: "Empurror",
    kind: "item",
    skillCost: 1,
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): Chose one (or all three, if you have an artifact): / -2 Clank! -OR- $1 -OR- You don't have to stop in Crystal Caves this turn.
  },
  {
    id: "golden-flute",
    name: "Golden Flute",
    kind: "item",
    skillCost: 1,
    playEffects: { gold: 1, clank: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): $1, +1 Clank! / You may buy one item from the Market this turn for $5 (even if you're not in a Market room).
  },
  {
    id: "payoff",
    name: "Payoff",
    kind: "item",
    skillCost: 1,
    playEffects: { skill: 3 },
    verified: true,
    // Texto oficial (Clank! Catacombs): Trash this card.
  },
  {
    id: "rebel-scribe",
    name: "Rebel Scribe",
    kind: "item",
    skillCost: 1,
    playEffects: { skill: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you have another companion in your play area, draw a card.
  },
  {
    id: "waystone",
    name: "Waystone",
    kind: "item",
    skillCost: 1,
    playEffects: { boots: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): You may trash this to teleport from one Wayshrine to another.
  },
  {
    id: "flamboyance",
    name: "Flamboyance",
    kind: "item",
    skillCost: 2,
    playEffects: { drawCards: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): Draw a card. / If you make 2 or more Clank! this turn, +2 Skill.
  },
  {
    id: "imp-familiar",
    name: "Imp Familiar",
    kind: "item",
    skillCost: 2,
    points: 1,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Take a lockpick -OR- Spend a lockpick to draw two cards.
  },
  {
    id: "pillage",
    name: "Pillage",
    kind: "item",
    skillCost: 2,
    playEffects: { swords: 2, boots: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): If you gain at least $3 this turn, draw a card.
  },
  {
    id: "remove-traps",
    name: "Remove Traps",
    kind: "item",
    skillCost: 2,
    playEffects: { skill: 1, swords: 2 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): Replace a card in the dungeon row. / (If the new card has a dragon attack symbol, ignore it.)
  },
  {
    id: "shadow-walk",
    name: "Shadow Walk",
    kind: "item",
    skillCost: 2,
    playEffects: { boots: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): Trash a Burgle in your play area or discard pile.
  },
  {
    id: "astral-projection",
    name: "Astral Projection",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you generate 6 Skill or more this turn, mark a Wayshrine (as though you were there).
  },
  {
    id: "boots-of-the-ape-lord",
    name: "Boots of the Ape Lord",
    kind: "item",
    skillCost: 3,
    playEffects: { boots: 3, clank: 3 },
    points: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): +3 Clank! / If you have a monkey idol, you don't have to stop in Crystal Caves this turn.
  },
  {
    id: "bard",
    name: "Bard",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2, clank: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): +1 Clank! / If you make 2 or more Clank! this turn, ♥♥.
  },
  {
    id: "breakout",
    name: "Breakout! (Promo)",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 1, swords: 1, boots: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you freed any prisoners this turn, $3 and +1 Clank!
  },
  {
    id: "lie-in-wait",
    name: "Lie in Wait",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2, swords: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you're in a Crystal Cave, -2 Clank!
  },
  {
    id: "lightstick",
    name: "Lightstick",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 3, clank: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): +1 Clank!
  },
  {
    id: "rebel-thief",
    name: "Rebel Thief",
    kind: "item",
    skillCost: 3,
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): Take a lockpick. / If you have another companion in your play area, draw a card.
  },
  {
    id: "riot",
    name: "Riot",
    kind: "item",
    skillCost: 3,
    playEffects: { swords: 1, boots: 1, clank: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): +1 Clank! / If you have freed three or more prisoners, you may trash a card in your play area or discard pile.
  },
  {
    id: "scavenger",
    name: "Scavenger",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2 },
    points: 1,
    verified: true,
  },
  {
    id: "smash-and-grab",
    name: "Smash and Grab",
    kind: "item",
    skillCost: 3,
    playEffects: { clank: 2, drawCards: 2 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): +2 Clank! / Draw two cards.
  },
  {
    id: "sneak-attack",
    name: "Sneak Attack",
    kind: "item",
    skillCost: 3,
    playEffects: { swords: 3, clank: -2 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): -2 Clank!
  },
  {
    id: "sudden-movement",
    name: "Sudden Movement",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 1, boots: 2 },
    points: 1,
    verified: true,
    // Ao chegar na Dungeon Row: Each player alone on a square tile must rotate that tile to a new orientation.
  },
  {
    id: "swindle",
    name: "Swindle",
    kind: "item",
    skillCost: 3,
    points: 1,
    verified: true,
  },
  {
    id: "bandit",
    name: "Bandit",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 1, swords: 1, boots: 1 },
    points: 2,
    verified: true,
  },
  {
    id: "charlatan",
    name: "Charlatan",
    kind: "item",
    skillCost: 4,
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): Discard a card to draw two cards.
  },
  {
    id: "corrupt-advisor",
    name: "Corrupt Advisor",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 2 },
    points: 2,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Each other player gets +1 Clank! / If you have a crown, they get +2 Clank! instead.
    // Ao chegar na Dungeon Row: DANGER Pull +1 cube for dragon attacks.
  },
  {
    id: "divining-rod",
    name: "Divining Rod",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 2 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you generate 6 Skill or more this turn, ♥.
  },
  {
    id: "elven-sword",
    name: "Elven Sword",
    kind: "item",
    skillCost: 4,
    playEffects: { swords: 2, drawCards: 1 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): Draw a card.
  },
  {
    id: "librarian",
    name: "Librarian",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 2, clank: -2 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): -2 Clank! / If you have a Secret Tome in your play area or discard pile, draw two cards.
  },
  {
    id: "mister-wizkers",
    name: "Mister Wizkers",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 1, swords: 1, boots: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you placed one of your cubes in the dungeon this turn, draw a card.
    // Ao chegar na Dungeon Row: Put 3 dragon cubes back in the bag.
  },
  {
    id: "rebel-paladin",
    name: "Rebel Paladin",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 1, swords: 1 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you have another companion in your play area, draw a card. / If you have an artifact, draw a card.
  },
  {
    id: "skulker",
    name: "Skulker",
    kind: "item",
    skillCost: 4,
    playEffects: { boots: 2 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): Ignore monsters in tunnels this turn.
  },
  {
    id: "smoky-quartz",
    name: "Smoky Quartz",
    kind: "item",
    skillCost: 4,
    playEffects: { clank: -2, drawCards: 1 },
    points: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): -2 Clank! / Draw a card.
  },
  {
    id: "spectral-rider",
    name: "Spectral Rider",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 2, boots: 1 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you're on a haunted tile, you may teleport to any room on a different haunted tile.
  },
  {
    id: "white-tourmaline",
    name: "White Tourmaline",
    kind: "item",
    skillCost: 4,
    playEffects: { drawCards: 1 },
    points: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Draw a card. / When a Ghost would damage you, you may discard this to prevent that and draw a card.
  },
  {
    id: "brave-hero",
    name: "Brave Hero",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2, swords: 1, boots: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): Worth 5 VP if you have freed three or more Prisoners.
  },
  {
    id: "curator",
    name: "Curator",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2, boots: 1 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): Draw a card for each artifact you have.
  },
  {
    id: "diversion",
    name: "Diversion",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2 },
    points: 2,
    verified: true,
    // Ao chegar na Dungeon Row: Put 3 dragon cubes back in the bag.
  },
  {
    id: "expert-guide",
    name: "Expert Guide",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2, boots: 2 },
    points: 2,
    verified: true,
  },
  {
    id: "rebel-general",
    name: "Rebel General",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2, swords: 1, boots: 1 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you have another companion in your play area, draw a card.
  },
  {
    id: "robbery",
    name: "Robbery",
    kind: "item",
    skillCost: 5,
    playEffects: { swords: 2, gold: 2 },
    points: 1,
    verified: true,
    // Texto oficial (Clank! Catacombs): $2 / If you're in a Market room, teleport to an adjacent room.
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    kind: "item",
    skillCost: 5,
    playEffects: { clank: -2, drawCards: 1 },
    points: 4,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): -2 Clank! / Draw a card.
  },
  {
    id: "black-tourmaline",
    name: "Black Tourmaline",
    kind: "item",
    skillCost: 6,
    playEffects: { drawCards: 1 },
    points: 5,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Draw a card. / When a Ghost would damage you, you may discard this to prevent that and draw a card.
  },
  {
    id: "crystal-compass",
    name: "Crystal Compass",
    kind: "item",
    skillCost: 6,
    playEffects: { drawCards: 2 },
    points: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): Draw two cards. / You don't have to stop in Crystal Caves this turn.
  },
  {
    id: "double-cross",
    name: "Double Cross",
    kind: "item",
    skillCost: 6,
    playEffects: { skill: 2, clank: -2 },
    points: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): -2 Clank!
  },
  {
    id: "expensive-taste",
    name: "Expensive Taste",
    kind: "item",
    skillCost: 6,
    playEffects: { skill: 3, gold: 2 },
    verified: true,
    // Texto oficial (Clank! Catacombs): $2 / Worth 5 VP if you have a crown and a gem.
  },
  {
    id: "fiery-quartz",
    name: "Fiery Quartz",
    kind: "item",
    skillCost: 6,
    playEffects: { clank: -2, drawCards: 1 },
    points: 5,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): -2 Clank! / Draw a card.
  },
  {
    id: "floating-skull",
    name: "Floating Skull",
    kind: "item",
    skillCost: 6,
    playEffects: { skill: 2, swords: 1 },
    points: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you have a crown, teleport to an adjacent room.
  },
  {
    id: "grand-theft",
    name: "Grand Theft",
    kind: "item",
    skillCost: 6,
    points: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): Take a lockpick —OR— Spend a lockpick yo use a device or acquire a card in the dungeon row.
  },
  {
    id: "lute",
    name: "Lute",
    kind: "item",
    skillCost: 6,
    playEffects: { clank: 1, drawCards: 2 },
    points: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): +1 Clank! / Draw two cards. / For each Clank! you make this turn, $1.
  },
  {
    id: "souldrinker",
    name: "Souldrinker",
    kind: "item",
    skillCost: 6,
    playEffects: { swords: 4 },
    points: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): If you defeat a monster in the dungeon row this turn, ♥.
  },
  {
    id: "thirst-for-adventure",
    name: "Thirst for Adventure",
    kind: "item",
    skillCost: 7,
    playEffects: { boots: 3 },
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Worth 2 VP for each artifact and each mokey idol you have.
  },
  {
    id: "blink-spell",
    name: "Blink Spell",
    kind: "item",
    skillCost: 8,
    playEffects: { skill: 3 },
    points: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Teleport to an adjacent room -OR- Teleport to another player in the Depths.
  },
  {
    id: "wishing-well",
    name: "Wishing Well",
    kind: "device",
    skillCost: 0,
    acquireEffects: { drawCards: 2 },
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): You must spend $3 to use. / USE: / Draw two cards.
    // Ao chegar na Dungeon Row: DANGER Pull +1 cube for dragon attacks.
  },
  {
    id: "darkened-alcove",
    name: "Darkened Alcove",
    kind: "device",
    skillCost: 2,
    acquireEffects: { clank: -2 },
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): USE: / -2 Clank!
  },
  {
    id: "dusty-map",
    name: "Dusty Map (Promo)",
    kind: "device",
    skillCost: 2,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): USE: / Place a new tile anywhere. / (Choose a new location for the tile before revealing it, but THEN choose its orientation as usual.)
  },
  {
    id: "underground-river",
    name: "Underground River",
    kind: "device",
    skillCost: 2,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): USE: / ♥ or Boot
  },
  {
    id: "locked-trunk",
    name: "Locked Trunk",
    kind: "device",
    skillCost: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): You must spend a lockpick to use. / USE: / Take a major secret.
  },
  {
    id: "thieves-shrine",
    name: "Thieves' Shrine",
    kind: "device",
    skillCost: 4,
    verified: true,
    // Texto oficial (Clank! Catacombs): USE: / $2 -OR- Trash up to two Burgles, each from your play area or discard pile.
    // Ao chegar na Dungeon Row: Put 3 dragon cubes back in the bag.
  },
  {
    id: "black-market",
    name: "Black Market",
    kind: "device",
    skillCost: 5,
    verified: true,
    // Texto oficial (Clank! Catacombs): USE: / Choose TWO: / $2 -OR- Trash a card in your play area or discard pile -OR- Take a lockpick.
  },
  {
    id: "skeleton",
    name: "Skeleton",
    kind: "monster",
    swordCost: 1,
    acquireEffects: { gold: 2, clank: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: $2, +1 Clank!
  },
  {
    id: "animated-wall",
    name: "Animated Wall",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { boots: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: 1 Boot / If you use a portal this turn, +1 Boot.
    // Ao chegar na Dungeon Row: Rotate each square tile with any players on it 180 degrees.
  },
  {
    id: "crystal-kobold",
    name: "Crystal Kobold",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { skill: 2 },
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Fight this only in a Crystal Cave or Wayshrine. / DEFEAT: 2 Skill
  },
  {
    id: "keymaster",
    name: "Keymaster",
    kind: "monster",
    swordCost: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: Take a Lockpick
  },
  {
    id: "skeleton-priest",
    name: "Skeleton Priest",
    kind: "monster",
    swordCost: 2,
    verified: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: ♥, +1 Clank!
    // Ao chegar na Dungeon Row: All players get +1 Clank!
  },
  {
    id: "archoverlord",
    name: "Archoverlord",
    kind: "monster",
    swordCost: 3,
    verified: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: Draw two cards, each other player gets +1 Clank!
    // Ao chegar na Dungeon Row: All players get +1 Clank!
  },
  {
    id: "marble-guardian",
    name: "Marble Guardian",
    kind: "monster",
    swordCost: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: Place a new tile next to your current one. Choose: / Teleport to any room on the new tile -OR- $2
  },
  {
    id: "skeletal-ape",
    name: "Skeletal Ape",
    kind: "monster",
    swordCost: 3,
    acquireEffects: { skill: 3, gold: 3, clank: 3 },
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: $3, 3 Skill, +3 Clank!
  },
  {
    id: "skeleton-warlock",
    name: "Skeleton Warlock",
    kind: "monster",
    swordCost: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: Take a Secret Tome, +1 Clank!
  },
  {
    id: "the-warden",
    name: "The Warden",
    kind: "monster",
    swordCost: 3,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): Deep (Fight only in the Depths.) / DEFEAT: Free two Prisoners
    // Ao chegar na Dungeon Row: DANGER Pull +1 cube for dragon attacks.
  },
  {
    id: "ogre-merchant",
    name: "Ogre Merchant",
    kind: "monster",
    swordCost: 4,
    verified: true,
    triggersDragonAttack: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: $5 -OR- If you're in a Market room, take a Market item (at no cost).
  },
];

/** Contagens reais (Clank! Catacombs) de cada carta no monte de masmorra embaralhado. */
export const DUNGEON_DECK_COUNTS: Record<string, number> = {
  empurror: 1,
  "golden-flute": 1,
  payoff: 2,
  "rebel-scribe": 1,
  waystone: 1,
  flamboyance: 2,
  "imp-familiar": 1,
  pillage: 2,
  "remove-traps": 2,
  "shadow-walk": 2,
  "astral-projection": 1,
  "boots-of-the-ape-lord": 1,
  bard: 2,
  breakout: 1,
  "lie-in-wait": 2,
  lightstick: 2,
  "rebel-thief": 1,
  riot: 2,
  scavenger: 2,
  "smash-and-grab": 2,
  "sneak-attack": 2,
  "sudden-movement": 2,
  swindle: 2,
  bandit: 2,
  charlatan: 2,
  "corrupt-advisor": 1,
  "divining-rod": 1,
  "elven-sword": 1,
  librarian: 1,
  "mister-wizkers": 1,
  "rebel-paladin": 1,
  skulker: 1,
  "smoky-quartz": 1,
  "spectral-rider": 1,
  "white-tourmaline": 2,
  "brave-hero": 1,
  curator: 1,
  diversion: 1,
  "expert-guide": 2,
  "rebel-general": 1,
  robbery: 2,
  "rose-quartz": 2,
  "black-tourmaline": 1,
  "crystal-compass": 1,
  "double-cross": 1,
  "expensive-taste": 1,
  "fiery-quartz": 1,
  "floating-skull": 1,
  "grand-theft": 1,
  lute: 1,
  souldrinker: 1,
  "thirst-for-adventure": 1,
  "blink-spell": 1,
  "wishing-well": 1,
  "darkened-alcove": 2,
  "dusty-map": 1,
  "underground-river": 2,
  "locked-trunk": 1,
  "thieves-shrine": 2,
  "black-market": 1,
  skeleton: 3,
  "animated-wall": 2,
  "crystal-kobold": 2,
  keymaster: 2,
  "skeleton-priest": 2,
  archoverlord: 3,
  "marble-guardian": 1,
  "skeletal-ape": 1,
  "skeleton-warlock": 1,
  "the-warden": 1,
  "ogre-merchant": 2,
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
 * 100% conferido contra a planilha oficial do Clank! Catacombs (ver nota do topo).
 */
export const RESERVE_CARDS: CardDefinition[] = [
  {
    id: "mercenary",
    name: "Mercenary",
    kind: "dungeon",
    skillCost: 2,
    playEffects: { skill: 1, swords: 2 },
    verified: true,
  },
  {
    id: "explore",
    name: "Explore",
    kind: "dungeon",
    skillCost: 3,
    playEffects: { skill: 2, boots: 1 },
    verified: true,
  },
  {
    id: "secret-tome",
    name: "Secret Tome",
    kind: "dungeon",
    skillCost: 7,
    points: 7,
    verified: true,
  },
  {
    id: "goblin",
    name: "Goblin",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { gold: 1 },
    verified: true,
    // Texto oficial (Clank! Catacombs): DEFEAT: $1 / (Don't discard after fighting.)
  },
];

/** Quantidade inicial de cada pilha da Reserva — real, do Clank! Catacombs. */
export const RESERVE_STARTING_COUNTS: Record<string, number> = {
  mercenary: 15,
  explore: 15,
  "secret-tome": 12,
  goblin: 1,
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
 * ⚠️ LEGADO — catálogo de nomes/quantidades do Clank! **básico** (não o Catacombs usado
 * acima), do "Clank! Card List" oficial do BoardGameGeek. Mantido só como referência caso
 * o projeto volte a usar o jogo básico no futuro; não é usado em nenhum lugar do motor.
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
  { name: "Move Silently", count: 2, category: "item" },
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
 * ⚠️ LEGADO — Secrets do Clank! **básico** (Field Reference Guide do manual oficial),
 * não confirmados pro Catacombs (que tem seus próprios "major secret"/lockpick etc., ver
 * texto das cartas acima). Mantido como referência; nenhum dos dois jogos tem tokens de
 * sala implementados no motor ainda.
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
