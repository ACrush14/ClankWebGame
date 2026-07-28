import type { CardDefinition } from "./types.js";

/**
 * REVERSÃO PRO JOGO BASE (2026-07-24): este arquivo agora usa o conteúdo real do
 * **Clank! A Deck-Building Adventure** (jogo base, sem expansões) — substituindo o
 * conteúdo temporário do Clank! Catacombs usado numa sessão anterior por engano.
 *
 * Fontes, da mais pra menos autoritativa:
 * 1. Planilha própria do usuário (`research/clank-steam/planilha-usuario.csv`),
 *    montada cruzando fotos oficiais das cartas físicas — fonte PRIMÁRIA pra
 *    custo/efeito/quantidade/VP de cada carta.
 * 2. Fotos individuais de cartas físicas linkadas no BoardGameGeek (uploader Cvaast),
 *    usadas pra conferir número exato de ícones em alguns monstros/dispositivos —
 *    ver `research/clank-steam/cartas-capturadas.md`.
 * 3. Manual oficial em PDF (`research/clank-steam/regras-oficiais-rulebook.md`) —
 *    usado pro baralho inicial, Reserva, e como desempate em 2-3 cartas citadas como
 *    exemplo no próprio manual (Burgle, Stumble, Move Silently, Mercenary, Orc Grunt).
 *
 * Efeitos incluídos aqui (`playEffects`/`acquireEffects`/`arriveEffects`) só cobrem o
 * que dá pra representar com segurança no modelo atual de `CardEffects`
 * (skill/swords/boots/gold/clank/drawCards/heal). Nunca adivinho qual branch de um
 * "escolha X -OU- Y" ou de um "se você..." condicional deveria valer — toda carta
 * guarda o texto oficial completo (traduzido) num comentário `// Nota:` logo abaixo,
 * então nada foi perdido. Mecânicas ainda sem suporte genérico no motor, usadas por
 * várias cartas abaixo (ver comentários pontuais):
 * - Escolha entre efeitos (ex: "3 Swords -OU- $2 -OU- cura 1") — motor não tem conceito
 *   de escolha do jogador dentro de uma carta.
 * - "Descarte uma carta pra..." — exige escolher qual carta descartar da mão.
 * - Bônus condicional a ter outro Companheiro em jogo, um Artefato, uma Coroa, um
 *   Ídolo de Macaco, etc. — exigiria consultar o estado do jogador durante o efeito.
 * - Teleporte (mover pra sala adjacente ignorando túnel/custo) — não existe no motor.
 * - Trocar uma carta da Dungeon Row, ou "trash" uma carta específica da mão/descarte —
 *   não existem como ações genéricas ainda.
 * - "+1 mana/ouro/ponto por cada X que você tem" (bônus escalável) — não modelado.
 * - Efeito que afeta só os OUTROS jogadores (diferente de `arriveEffects`, que afeta
 *   TODOS, e de `playEffects`/`acquireEffects`, que só afetam quem jogou/adquiriu).
 *
 * `descriptionPt` (2026-07-28, a pedido do usuário): descrição em português do efeito
 * completo da carta, pro jogador ler na UI — inclui as cláusulas condicionais/de escolha
 * de cima mesmo quando o motor não as executa automaticamente (mesma lógica do texto
 * oficial impresso na carta física). Isso é intencional: a carta real diz isso, e
 * esconder a cláusula deixaria a descrição incompleta/enganosa por omissão. O comentário
 * `// Nota:` de cada carta continua sendo a referência de que fração disso é de fato
 * aplicada pelo motor.
 */

export const STARTING_DECK: CardDefinition[] = [
  {
    id: "burgle",
    name: "Burgle",
    nomePt: "Furtar",
    descriptionPt: "Ganhe 1 Skill.",
    kind: "starting",
    playEffects: { skill: 1 },
    verified: true,
  },
  {
    id: "scramble",
    name: "Scramble",
    nomePt: "Correria",
    descriptionPt: "Ganhe 1 Skill e 1 Bota.",
    kind: "starting",
    playEffects: { skill: 1, boots: 1 },
    verified: true,
  },
  {
    id: "sidestep",
    name: "Sidestep",
    nomePt: "Desviar",
    descriptionPt: "Ganhe 1 Bota.",
    kind: "starting",
    playEffects: { boots: 1 },
    verified: true,
  },
  {
    id: "stumble",
    name: "Stumble",
    nomePt: "Tropeço",
    descriptionPt: "Ganhe 1 Clank!.",
    kind: "starting",
    playEffects: { clank: 1 },
    verified: true,
    // Nota: +1 Clank! (CONFIRMADO no manual oficial, é o exemplo de carta usado lá.)
  },
];

/** CONFIRMADO na planilha e no manual oficial: 6 Burgle, 2 Stumble, 1 Scramble, 1 Sidestep por jogador. */
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

/** Monte de masmorra embaralhado — jogo base, ver nota do topo do arquivo. */
export const DUNGEON_DECK: CardDefinition[] = [
  {
    id: "sneak",
    name: "Sneak",
    nomePt: "Furtividade",
    descriptionPt: "Ganhe 1 Skill e 1 Bota. Remova 2 Clank!.",
    kind: "item",
    skillCost: 2,
    playEffects: { skill: 1, boots: 1, clank: -2 },
    verified: true,
    // Nota da planilha: -2 Clank, 1 Skill e 1 Boot.
    // ⚠️ Discrepância: uma captura ao vivo no Steam anterior tinha registrado custo 1,
    // Boots+1, -2 Clank (sem Skill) pra essa mesma carta ("Furtividade") — a planilha
    // (de foto física) é a fonte usada aqui; vale reconferir se possível.
  },
  {
    id: "move-silently",
    name: "Move Silently",
    nomePt: "Mover em Silêncio",
    descriptionPt: "Ganhe 2 Botas. Remova 2 Clank!.",
    kind: "item",
    skillCost: 3,
    playEffects: { boots: 2, clank: -2 },
    verified: true,
    // Nota: -2 Clank, 2 Boots. CONFIRMADO também no manual oficial (carta de exemplo).
  },
  {
    id: "elven-cloak",
    name: "Elven Cloak",
    nomePt: "Manto Élfico",
    descriptionPt: "Ganhe 1 Skill. Remova 2 Clank!. Compre 1 carta.",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 1, clank: -2, drawCards: 1 },
    points: 2,
    verified: true,
    // Nota: -2 Clank. Puxe uma carta.
  },
  {
    id: "singing-sword",
    name: "Singing Sword",
    nomePt: "Espada Cantante",
    descriptionPt:
      "Ganhe 3 Skill, 2 Swords e 1 Clank!. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 3, swords: 2, clank: 1 },
    points: 2,
    triggersDragonAttack: true,
    verified: true,
    // Nota: 1 Clank. Ao revelar, ataque do Dragão.
  },
  {
    id: "lucky-coin",
    name: "Lucky Coin",
    nomePt: "Moeda da Sorte",
    descriptionPt: "Ganhe 1 Skill e 1 Clank!. Compre 1 carta.",
    kind: "item",
    skillCost: 1,
    playEffects: { skill: 1, clank: 1, drawCards: 1 },
    points: 1,
    verified: true,
    // Nota: 1 Clank. Puxe uma carta.
  },
  {
    id: "underworld-dealing",
    name: "Underworld Dealing",
    nomePt: "Negócio do Submundo",
    descriptionPt: "Ganhe 1 Moeda -OU- gaste 7 Moedas para comprar 2 Tomos Secretos.",
    kind: "item",
    skillCost: 1,
    verified: true,
    // Nota: 1 Moeda -OU- gaste 7 moedas para comprar 2 Tomos Secreto. Escolha não modelada.
  },
  {
    id: "dead-run",
    name: "Dead Run",
    nomePt: "Corrida Mortal",
    descriptionPt: "Ganhe 2 Botas e 2 Clank!. Você não precisa parar em Cavernas de Cristal neste turno.",
    kind: "item",
    skillCost: 3,
    playEffects: { boots: 2, clank: 2 },
    verified: true,
    // Nota: +2 Clank. Você não precisa parar em Cavernas de Cristal esse turno.
    // ⚠️ Regra de "não precisa parar" não modelada (motor não tem exceção de movimento por turno).
  },
  {
    id: "pickaxe",
    name: "Pickaxe",
    nomePt: "Picareta",
    descriptionPt: "Ganhe 2 Swords e 2 Moedas.",
    kind: "item",
    skillCost: 4,
    playEffects: { swords: 2, gold: 2 },
    verified: true,
    // Nota: 2 Moedas, 2 Ataque.
  },
  {
    id: "boots-of-swiftness",
    name: "Boots of Swiftness",
    nomePt: "Botas da Agilidade",
    descriptionPt: "Ganhe 3 Botas. Ao adquirir, ganhe 1 Bota extra.",
    kind: "item",
    skillCost: 5,
    playEffects: { boots: 3 },
    acquireEffects: { boots: 1 },
    points: 3,
    verified: true,
    // Nota: 3 Boots. Ao adquirir, +1 Boot.
  },
  {
    id: "silver-spear",
    name: "Silver Spear",
    nomePt: "Lança de Prata",
    descriptionPt: "Ganhe 3 Swords. Ao adquirir, ganhe 1 Sword extra.",
    kind: "item",
    skillCost: 3,
    playEffects: { swords: 3 },
    acquireEffects: { swords: 1 },
    points: 2,
    verified: true,
    // Nota: 3 de Ataque. Ao adquirir, +1 Ataque.
  },
  {
    id: "scepter-of-the-ape-lord",
    name: "Scepter of the Ape Lord",
    nomePt: "Cetro do Senhor Macaco",
    descriptionPt: "Ganhe 3 Skill e 3 Clank!.",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 3, clank: 3 },
    points: 3,
    verified: true,
    // Nota: 3 Skill. +3 Clank.
  },
  {
    id: "treasure-map",
    name: "Treasure Map",
    nomePt: "Mapa do Tesouro",
    descriptionPt: "Ganhe 5 Moedas.",
    kind: "item",
    skillCost: 6,
    playEffects: { gold: 5 },
    verified: true,
    // Nota: 5 Moedas.
  },
  {
    id: "amulet-of-vigor",
    name: "Amulet of Vigor",
    nomePt: "Amuleto do Vigor",
    descriptionPt: "Ganhe 4 Skill. Ao adquirir, cure 1 de dano.",
    kind: "item",
    skillCost: 7,
    playEffects: { skill: 4 },
    acquireEffects: { heal: 1 },
    points: 3,
    verified: true,
    // Nota: Ao adquirir, ganhe 1 coração.
  },
  {
    id: "search",
    name: "Search",
    nomePt: "Busca",
    descriptionPt: "Ganhe 2 Skill e 1 Bota. A cada Moeda ganha neste turno, ganhe +1 Moeda extra.",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 2, boots: 1 },
    verified: true,
    // Nota: Cada vez que você ganhar ouro esse turno, ganhe +1 ouro a mais.
    // ⚠️ Bônus escalável de ouro no turno não modelado.
  },
  {
    id: "sleight-of-hand",
    name: "Sleight of Hand",
    nomePt: "Prestidigitação",
    descriptionPt: "Descarte uma carta para comprar duas cartas.",
    kind: "item",
    skillCost: 2,
    verified: true,
    // Nota: Descarte uma carta para comprar duas cartas. Escolha de qual carta descartar não modelada.
  },
  {
    id: "diamond",
    name: "Diamond",
    nomePt: "Diamante",
    descriptionPt:
      "Gema. Ao adquirir, ganhe 2 Clank! e compre 1 carta. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 8,
    acquireEffects: { clank: 2, drawCards: 1 },
    points: 8,
    triggersDragonAttack: true,
    verified: true,
    // Nota: Gema. Ao adquirir, +2 Clank. Puxe uma carta. Ao revelar, ataque do dragão.
  },
  {
    id: "emerald",
    name: "Emerald",
    nomePt: "Esmeralda",
    descriptionPt:
      "Gema. Ao adquirir, ganhe 2 Clank! e compre 1 carta. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 5,
    acquireEffects: { clank: 2, drawCards: 1 },
    points: 5,
    triggersDragonAttack: true,
    verified: true,
    // Nota: Gema. Ao adquirir, +2 Clank. Puxe uma carta. Ao revelar, ataque do dragão.
  },
  {
    id: "ruby",
    name: "Ruby",
    nomePt: "Rubi",
    descriptionPt:
      "Gema. Ao adquirir, ganhe 2 Clank! e compre 1 carta. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 6,
    acquireEffects: { clank: 2, drawCards: 1 },
    points: 6,
    triggersDragonAttack: true,
    verified: true,
    // Nota: Gema. Ao adquirir, +2 Clank. Puxe uma carta. Ao revelar, ataque do dragão.
  },
  {
    id: "sapphire",
    name: "Sapphire",
    nomePt: "Safira",
    descriptionPt:
      "Gema. Ao adquirir, ganhe 2 Clank! e compre 1 carta. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 4,
    acquireEffects: { clank: 2, drawCards: 1 },
    points: 4,
    triggersDragonAttack: true,
    verified: true,
    // Nota: Gema. Ao adquirir, +2 Clank. Puxe uma carta. Ao revelar, ataque do dragão.
  },
  {
    id: "dragons-eye",
    name: "Dragon's Eye",
    nomePt: "Olho de Dragão",
    descriptionPt:
      "Gema. Só pode ser adquirida nas Profundezas. Ao adquirir, ganhe 2 Clank! e compre 1 carta. Vale 10 pontos se você tiver uma Moeda de Maestria. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 5,
    acquireEffects: { clank: 2, drawCards: 1 },
    requiresRoomFlag: "isDepths",
    verified: true,
    triggersDragonAttack: true,
    // Nota: Gema. Ao adquirir, +2 Clank. Puxe uma carta. Ao revelar, ataque do dragão.
    // Só pode ser adquirida nas Profundezas. Vale 10 pontos se tem uma moeda de maestria (condicional não modelado — base 0 pontos).
  },
  {
    id: "flying-carpet",
    name: "Flying Carpet",
    nomePt: "Tapete Voador",
    descriptionPt: "Ganhe 2 Botas. Neste turno, ignore monstros em túneis e não precisa parar em Cavernas de Cristal.",
    kind: "item",
    skillCost: 6,
    playEffects: { boots: 2 },
    points: 2,
    verified: true,
    // Nota: Nesse turno, ignore monstros em túneis e você não precisa parar em Cavernas de Cristal.
    // ⚠️ Regras especiais de movimento no turno não modeladas.
  },
  {
    id: "swagger",
    name: "Swagger",
    nomePt: "Ostentação",
    descriptionPt: "Ganhe 1 Bota. A cada Clank! que você fizer neste turno, ganhe +1 Skill.",
    kind: "item",
    skillCost: 2,
    playEffects: { boots: 1 },
    verified: true,
    // Nota: Para cada Clank que fizer esse turno, ganhe +1 Skill. Bônus reativo não modelado.
  },
  {
    id: "bracers-of-agility",
    name: "Bracers of Agility",
    nomePt: "Braceletes da Agilidade",
    descriptionPt: "Compre 2 cartas.",
    kind: "item",
    skillCost: 5,
    playEffects: { drawCards: 2 },
    points: 2,
    verified: true,
    // Nota: Puxe 2 cartas.
  },
  {
    id: "brilliance",
    name: "Brilliance",
    nomePt: "Brilhantismo",
    descriptionPt: "Compre 3 cartas.",
    kind: "item",
    skillCost: 6,
    playEffects: { drawCards: 3 },
    verified: true,
    // Nota: Puxe 3 cartas.
  },
  {
    id: "elven-boots",
    name: "Elven Boots",
    nomePt: "Botas Élficas",
    descriptionPt: "Ganhe 1 Skill e 1 Bota. Compre 1 carta.",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 1, boots: 1, drawCards: 1 },
    points: 2,
    verified: true,
    // Nota: Puxe uma carta.
  },
  {
    id: "elven-dagger",
    name: "Elven Dagger",
    nomePt: "Adaga Élfica",
    descriptionPt: "Ganhe 1 Skill e 1 Sword. Compre 1 carta.",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 1, swords: 1, drawCards: 1 },
    points: 2,
    verified: true,
    // Nota: Puxe uma carta.
  },
  {
    id: "wand-of-recall",
    name: "Wand of Recall",
    nomePt: "Varinha de Retorno",
    descriptionPt: "Ganhe 2 Skill. Se você possuir um artefato, teleporte para uma câmara adjacente.",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2 },
    points: 1,
    verified: true,
    // Nota: Se você possui um artefato, teleporte para uma câmara adjacente — MODELADO
    // como caso especial em `GameEngine.maybeGrantTeleport` (checa `artifactsCarried > 0`
    // na hora), já que `grantsTeleport` genérico não representa condicional.
  },
  {
    id: "wand-of-wind",
    name: "Wand of Wind",
    nomePt: "Varinha do Vento",
    descriptionPt: "Teleporte para uma câmara adjacente -OU- pegue um bônus/segredo de uma câmara adjacente.",
    kind: "item",
    skillCost: 6,
    points: 3,
    verified: true,
    // Nota: Teleporte para uma câmara adjacente -OU- pegue um bônus/segredo de uma câmara adjacente. Não modelado.
  },
  {
    id: "tattle",
    name: "Tattle",
    nomePt: "Fofoca",
    descriptionPt: "Cada outro jogador ganha +1 Clank!.",
    kind: "item",
    skillCost: 2,
    points: 3,
    verified: true,
    // CONFIRMADO por foto da carta física (2026-07-24): Custo 2, VP 3, sem efeito
    // incondicional de Skill (corrige a planilha, que tinha Custo 3 + Skill+2 — provável
    // erro de digitação cruzando com outra carta).
    // Texto: "Each other player gets +1 Clank!" — "There's no honor among thieves...
    // but lots of dirty laundry." Efeito "todos os OUTROS" não modelado (diferente de
    // arriveEffects, que afeta TODOS os jogadores igualmente).
  },
  {
    id: "tunnel-guide",
    name: "Tunnel Guide",
    nomePt: "Guia de Túneis",
    descriptionPt: "Ganhe 1 Bota e 1 Sword.",
    kind: "item",
    skillCost: 1,
    playEffects: { boots: 1, swords: 1 },
    points: 1,
    verified: true,
    // Nota: Companheiro, sem texto condicional extra.
  },
  {
    id: "gem-collector",
    name: "Gem Collector",
    nomePt: "Colecionador de Gemas",
    descriptionPt: "Ganhe 2 Skill. Remova 2 Clank!. Gemas custam 2 Skill a menos neste turno.",
    kind: "item",
    skillCost: 4,
    playEffects: { skill: 2, clank: -2 },
    points: 2,
    verified: true,
    // Nota: -2 Clank. Gemas custam 2 Skill a menos nesse turno. Desconto temporário não modelado.
  },
  {
    id: "invoker-of-the-ancients",
    name: "Invoker of the Ancients",
    nomePt: "Invocador dos Antigos",
    descriptionPt: "Ganhe 1 Clank!. Teleporte para uma câmara adjacente.",
    kind: "item",
    skillCost: 4,
    playEffects: { clank: 1 },
    grantsTeleport: true,
    points: 1,
    verified: true,
    // Nota: Teleporte para uma câmara adjacente — MODELADO via `grantsTeleport`.
  },
  {
    id: "kobold-merchant",
    name: "Kobold Merchant",
    nomePt: "Mercador Kobold",
    descriptionPt: "Ganhe 2 Moedas (+2 Moedas extra se você tiver um artefato).",
    kind: "item",
    skillCost: 3,
    playEffects: { gold: 2 },
    points: 1,
    verified: true,
    // Nota: Se você tem um artefato, a carta vale +2 (a planilha diz "mana"; o manual
    // oficial mostra essa carta como exemplo com "+$2" se tiver artefato — condicional
    // não modelado de qualquer forma, ver nota no topo do arquivo).
  },
  {
    id: "rebel-miner",
    name: "Rebel Miner",
    nomePt: "Minerador Rebelde",
    descriptionPt: "Ganhe 2 Moedas. Se você tiver um Companheiro em jogo, compre 1 carta.",
    kind: "item",
    skillCost: 2,
    playEffects: { gold: 2 },
    points: 1,
    verified: true,
    // Nota: Se você tem um companheiro na área de jogo, puxe uma carta. Condicional não modelado.
  },
  {
    id: "monkey-bot-3000",
    name: "Monkey Bot 3000",
    nomePt: "Macaco-Robô 3000",
    descriptionPt: "Ganhe 3 Clank!. Compre 3 cartas. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 5,
    playEffects: { clank: 3, drawCards: 3 },
    points: 1,
    triggersDragonAttack: true,
    verified: true,
    // Nota: +3 Clank. Puxe 3 cartas. Ao revelar, ataque do dragão.
  },
  {
    id: "cleric-of-the-sun",
    name: "Cleric of the Sun",
    nomePt: "Clérigo do Sol",
    descriptionPt: "Ganhe 2 Skill e 1 Sword. Ao adquirir, cure 1 de dano.",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2, swords: 1 },
    acquireEffects: { heal: 1 },
    points: 1,
    verified: true,
    // Nota: Ao adquirir, ganhe 1 coração.
  },
  {
    id: "apothecary",
    name: "Apothecary",
    nomePt: "Boticário",
    descriptionPt: "Descarte uma carta para escolher um dos seguintes: +3 Swords -OU- +2 Moedas -OU- cure 1 de dano.",
    kind: "item",
    skillCost: 3,
    points: 2,
    playChoices: [
      { icon: "swords", amount: 3, label: "Swords +3" },
      { icon: "gold", amount: 2, label: "Moedas +2" },
      { icon: "heal", amount: 1, label: "Cura 1" },
    ],
    verified: true,
    // Nota: Descarte uma carta para escolher um dos seguintes: +3 Swords -OU- +2 Moedas
    // -OU- +1 Coração. ⚠️ O requisito de descartar uma carta primeiro NÃO é modelado
    // (exigiria escolher qual carta da mão descartar) — a escolha do efeito em si já é.
  },
  {
    id: "dwarven-peddler",
    name: "Dwarven Peddler",
    nomePt: "Vendedor Anão",
    descriptionPt:
      "Ganhe 1 Bota e 2 Moedas. Vale 4 pontos se você tiver pelo menos 2 dos seguintes: Cálice, Ovo de Dragão e Ídolo de Macaco.",
    kind: "item",
    skillCost: 4,
    playEffects: { boots: 1, gold: 2 },
    points: 2,
    verified: true,
    // Nota: Vale 4 pontos se você tem pelo menos 2 dos seguintes: Cálice, Ovo de Dragão e Ídolo de Macaco. Bônus condicional não modelado (pontos base = 2).
  },
  {
    id: "master-burglar",
    name: "Master Burglar",
    nomePt: "Mestre Ladrão",
    descriptionPt: "Ganhe 2 Skill. Jogue um Burgle da sua mão ou descarte para o lixo (trash).",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2 },
    points: 2,
    verified: true,
    // Nota: Jogue um Burgle da sua mão ou descarte para o lixo (trash). Ação de "trash" específica não modelada.
  },
  {
    id: "mister-whiskers",
    name: "Mister Whiskers",
    nomePt: "Senhor Bigodes",
    descriptionPt: "O Dragão ataca -OU- remova 2 Clank!. Ao ser revelada na Fileira da Masmorra, dispara um ataque do dragão.",
    kind: "item",
    skillCost: 1,
    points: 1,
    triggersDragonAttack: true,
    verified: true,
    // Nota: O Dragão ataca -OU- -2 Clank (escolha não modelada). Ao revelar, ataque do dragão.
  },
  {
    id: "archaeologist",
    name: "Archaeologist",
    nomePt: "Arqueólogo",
    descriptionPt: "Compre 1 carta. Se você possuir um Ídolo de Macaco, ganhe +2 Skill.",
    kind: "item",
    skillCost: 2,
    playEffects: { drawCards: 1 },
    points: 1,
    verified: true,
    // Nota: Se você possui um Ídolo de Macaco, +2 Skill. Condicional não modelado.
  },
  {
    id: "queen-of-hearts",
    name: "The Queen of Hearts",
    nomePt: "A Rainha de Copas",
    descriptionPt: "Ganhe 3 Skill e 1 Sword. Se você tiver uma coroa, cure 1 de dano.",
    kind: "item",
    skillCost: 6,
    playEffects: { skill: 3, swords: 1 },
    points: 3,
    verified: true,
    // Nota: Se tiver uma coroa, a carta vale +1 Coração (cura). Condicional não modelado.
  },
  {
    id: "rebel-captain",
    name: "Rebel Captain",
    nomePt: "Capitão Rebelde",
    descriptionPt: "Ganhe 2 Skill. Se você tiver um Companheiro em jogo, compre 1 carta.",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2 },
    points: 1,
    verified: true,
    // Nota: Se você tem um companheiro na área de jogo, puxe uma carta. Condicional não modelado.
  },
  {
    id: "rebel-scout",
    name: "Rebel Scout",
    nomePt: "Batedor Rebelde",
    descriptionPt: "Ganhe 2 Botas. Se você tiver um Companheiro em jogo, compre 1 carta.",
    kind: "item",
    skillCost: 3,
    playEffects: { boots: 2 },
    points: 1,
    verified: true,
    // Nota: Se você tem um companheiro na área de jogo, puxe uma carta. Condicional não modelado.
  },
  {
    id: "rebel-soldier",
    name: "Rebel Soldier",
    nomePt: "Soldado Rebelde",
    descriptionPt: "Ganhe 2 Swords. Se você tiver um Companheiro em jogo, compre 1 carta.",
    kind: "item",
    skillCost: 2,
    playEffects: { swords: 2 },
    points: 1,
    verified: true,
    // Nota: Se você tem um companheiro na área de jogo, puxe uma carta. Condicional não modelado.
  },
  {
    id: "treasure-hunter",
    name: "Treasure Hunter",
    nomePt: "Caçador de Tesouros",
    descriptionPt:
      "Ganhe 2 Skill e 2 Swords. Troque uma carta na Fileira da Masmorra por outra do monte; se a nova carta tiver o símbolo de ataque do dragão, ignore o ataque.",
    kind: "item",
    skillCost: 3,
    playEffects: { skill: 2, swords: 2 },
    points: 1,
    verified: true,
    // Nota: Troque uma carta na Dungeon Row por outra do monte. Se a nova carta tiver
    // símbolo de ataque do dragão, ignore o ataque. Troca de carta não modelada.
  },
  {
    id: "mountain-king",
    name: "The Mountain King",
    nomePt: "O Rei da Montanha",
    descriptionPt: "Ganhe 2 Skill, 1 Bota e 1 Sword (2 Swords e 2 Botas se você tiver uma coroa).",
    kind: "item",
    skillCost: 6,
    playEffects: { skill: 2, boots: 1, swords: 1 },
    points: 3,
    verified: true,
    // Nota: Se tiver uma coroa, vale +2 Swords e +2 Boots (em vez de +1/+1). Condicional não modelado.
  },
  {
    id: "the-duke",
    name: "The Duke",
    nomePt: "O Duque",
    descriptionPt: "Ganhe 2 Skill e 2 Swords. Vale +1 ponto para cada 5 Moedas que você tiver no fim de jogo.",
    kind: "item",
    skillCost: 5,
    playEffects: { skill: 2, swords: 2 },
    verified: true,
    // Nota: Vale +1 ponto por cada 5 moedas que você tiver no fim de jogo. Pontuação escalável não modelada (pontos base = 0).
  },
  {
    id: "wizard",
    name: "Wizard",
    nomePt: "Mago",
    descriptionPt: "Ganhe 3 Skill. Vale +2 pontos para cada Tomo Secreto que você tiver no fim de jogo.",
    kind: "item",
    skillCost: 6,
    playEffects: { skill: 3 },
    verified: true,
    // Nota: Vale +2 pontos para cada Tomo Secreto que você tem no fim de jogo. Pontuação escalável não modelada (pontos base = 0).
  },
  // --- Dispositivos (Devices) ---
  {
    id: "ladder",
    name: "Ladder",
    nomePt: "Escada",
    descriptionPt: "USE: ganhe 2 Botas.",
    kind: "device",
    skillCost: 3,
    acquireEffects: { boots: 2 },
    verified: true,
    // Nota: USE: +2 Boots.
  },
  {
    id: "shrine",
    name: "Shrine",
    nomePt: "Santuário",
    descriptionPt: "Ao ser revelada, devolva 3 cubos de dragão à bolsa. USE: escolha 1 Moeda -OU- cure 1 de dano.",
    kind: "device",
    skillCost: 2,
    acquireChoices: [
      { icon: "gold", amount: 1, label: "Moeda +1" },
      { icon: "heal", amount: 1, label: "Cura 1" },
    ],
    verified: true,
    // Nota: Ao revelar, devolva 3 cubos de dragão à bolsa (não modelado — motor não tem
    // pool de cubos persistente entre ataques, sorteia direto da contagem de Clank! de
    // cada jogador). USE: 1 Moeda -OU- 1 Coração — modelado como `acquireChoices`.
  },
  {
    id: "dragon-shrine",
    name: "Dragon Shrine",
    nomePt: "Altar do Dragão",
    descriptionPt:
      "PERIGO — enquanto estiver na Fileira da Masmorra, ataques do dragão puxam +1 cubo extra. USE: 2 Moedas -OU- jogue uma carta fora (trash).",
    kind: "device",
    skillCost: 4,
    isDanger: true,
    verified: true,
    // Nota: PERIGO — CONFIRMADO por foto da carta física: "Enquanto esta carta
    // permanecer na Fileira da Masmorra, os ataques do dragão compram +1 cubo."
    // USE: 2 Moedas -OU- Jogue uma carta fora da sua mão/descarte (trash). Escolha não modelada.
  },
  {
    id: "the-vault",
    name: "The Vault",
    nomePt: "O Cofre",
    descriptionPt:
      "Só pode ser adquirida nas Profundezas. USE: ganhe 5 Moedas e 3 Clank!. Ao ser revelada, dispara um ataque do dragão.",
    kind: "device",
    skillCost: 3,
    requiresRoomFlag: "isDepths",
    acquireEffects: { gold: 5, clank: 3 },
    triggersDragonAttack: true,
    verified: true,
    // Nota: Deep (só pode ser adquirida nas Profundezas). USE: 5 Moedas + 3 Clank. Ao revelar, ataque do dragão.
  },
  {
    id: "teleporter",
    name: "Teleporter",
    nomePt: "Teleportador",
    descriptionPt: "USE: teleporte para uma câmara adjacente.",
    kind: "device",
    skillCost: 4,
    grantsTeleport: true,
    verified: true,
    // Nota: USE: Teleporte para uma câmara adjacente — MODELADO via `grantsTeleport`,
    // disparado ao ADQUIRIR (mesmo padrão já usado pelos outros devices do jogo, que
    // aplicam o efeito de "USE:" uma vez, no momento da compra, em vez de repetível).
  },
  // --- Monstros ---
  {
    id: "animated-door",
    name: "Animated Door",
    nomePt: "Porta Animada",
    descriptionPt: "DERROTA: ganhe 1 Bota. Ao ser revelada, dispara um ataque do dragão.",
    kind: "monster",
    swordCost: 1,
    acquireEffects: { boots: 1 },
    triggersDragonAttack: true,
    verified: true,
    // Nota: DERROTA: +1 Boot. Ao revelar, ataque do dragão.
  },
  {
    id: "kobold",
    name: "Kobold",
    nomePt: "Kobold",
    descriptionPt: "PERIGO — enquanto estiver na Fileira da Masmorra, ataques do dragão puxam +1 cubo extra. DERROTA: ganhe 1 Skill.",
    kind: "monster",
    swordCost: 1,
    acquireEffects: { skill: 1 },
    isDanger: true,
    verified: true,
    // Nota: DERROTA: +1 Skill. PERIGO — CONFIRMADO por foto: "Pull +1 cube for dragon attacks."
  },
  {
    id: "cave-troll",
    name: "Cave Troll",
    nomePt: "Troll das Cavernas",
    descriptionPt: "DERROTA: ganhe 3 Moedas e compre 2 cartas. Ao ser revelada, dispara um ataque do dragão.",
    kind: "monster",
    swordCost: 4,
    acquireEffects: { gold: 3, drawCards: 2 },
    triggersDragonAttack: true,
    verified: true,
    // Nota: DERROTA: +3 Moedas, compre duas cartas. Ao revelar, ataque do dragão.
  },
  {
    id: "orc-grunt",
    name: "Orc Grunt",
    nomePt: "Orc Recruta",
    descriptionPt: "DERROTA: ganhe 3 Moedas. Ao ser revelada, dispara um ataque do dragão.",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { gold: 3 },
    triggersDragonAttack: true,
    verified: true,
    // Nota: DERROTA: +3 Moedas. Ao revelar, ataque do dragão.
  },
  {
    id: "belcher",
    name: "Belcher",
    nomePt: "Arrotador",
    descriptionPt: "DERROTA: ganhe 4 Moedas e 2 Clank!. Ao ser revelada, dispara um ataque do dragão.",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { gold: 4, clank: 2 },
    triggersDragonAttack: true,
    verified: true,
    // Nota: DERROTA: +4 Moedas, +2 Clank. Ao revelar, ataque do dragão.
  },
  {
    id: "ogre",
    name: "Ogre",
    nomePt: "Ogro",
    descriptionPt: "DERROTA: ganhe 5 Moedas. Ao ser revelada, dispara um ataque do dragão.",
    kind: "monster",
    swordCost: 3,
    acquireEffects: { gold: 5 },
    triggersDragonAttack: true,
    verified: true,
    // Nota: DERROTA: +5 Moedas. Ao revelar, ataque do dragão.
  },
  {
    id: "crystal-golem",
    name: "Crystal Golem",
    nomePt: "Golem de Cristal",
    descriptionPt: "Só pode ser enfrentado numa Caverna de Cristal. DERROTA: ganhe 3 Skill.",
    kind: "monster",
    swordCost: 3,
    requiresRoomFlag: "isCrystalCave",
    acquireEffects: { skill: 3 },
    verified: true,
    // Nota: Só pode ser derrotado na Caverna de Cristal. DERROTA: +3 Skill.
  },
  {
    id: "watcher",
    name: "Watcher",
    nomePt: "Observador",
    descriptionPt: "Ao ser revelada, todos os jogadores ganham +1 Clank!. DERROTA: ganhe 3 Moedas; todos os outros jogadores ganham +1 Clank!.",
    kind: "monster",
    swordCost: 3,
    acquireEffects: { gold: 3 },
    arriveEffects: { clank: 1 },
    verified: true,
    // Nota: Ao revelar, todos os jogadores ganham +1 Clank. DERROTA: +3 Moedas, todos os
    // OUTROS jogadores ganham +1 Clank (esse segundo efeito "só outros" não modelado).
  },
  {
    id: "overlord",
    name: "Overlord",
    nomePt: "Senhor Supremo",
    descriptionPt: "Ao ser revelada, todos os jogadores ganham +1 Clank!. DERROTA: compre 2 cartas.",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { drawCards: 2 },
    arriveEffects: { clank: 1 },
    verified: true,
    // Nota: Ao revelar, todos os jogadores ganham +1 Clank. DERROTA: compre 2 cartas.
  },
];

/** Contagens reais (jogo base, planilha do usuário) de cada carta no monte de masmorra embaralhado. */
export const DUNGEON_DECK_COUNTS: Record<string, number> = {
  sneak: 2,
  "move-silently": 2,
  "elven-cloak": 1,
  "singing-sword": 1,
  "lucky-coin": 2,
  "underworld-dealing": 1,
  "dead-run": 2,
  pickaxe: 2,
  "boots-of-swiftness": 1,
  "silver-spear": 2,
  "scepter-of-the-ape-lord": 1,
  "treasure-map": 1,
  "amulet-of-vigor": 1,
  search: 2,
  "sleight-of-hand": 2,
  diamond: 1,
  emerald: 2,
  ruby: 2,
  sapphire: 3,
  "dragons-eye": 1,
  "flying-carpet": 1,
  swagger: 2,
  "bracers-of-agility": 2,
  brilliance: 1,
  "elven-boots": 1,
  "elven-dagger": 1,
  "wand-of-recall": 2,
  "wand-of-wind": 1,
  tattle: 2,
  "tunnel-guide": 2,
  "gem-collector": 1,
  "invoker-of-the-ancients": 1,
  "kobold-merchant": 1,
  "rebel-miner": 1,
  "monkey-bot-3000": 1,
  "cleric-of-the-sun": 2,
  apothecary: 1,
  "dwarven-peddler": 1,
  "master-burglar": 2,
  "mister-whiskers": 1,
  archaeologist: 2,
  "queen-of-hearts": 1,
  "rebel-captain": 1,
  "rebel-scout": 1,
  "rebel-soldier": 1,
  "treasure-hunter": 2,
  "mountain-king": 1,
  "the-duke": 1,
  wizard: 1,
  ladder: 2,
  shrine: 3,
  "dragon-shrine": 2,
  "the-vault": 1,
  teleporter: 2,
  "animated-door": 2,
  kobold: 3,
  "cave-troll": 1,
  "orc-grunt": 3,
  belcher: 2,
  ogre: 2,
  "crystal-golem": 2,
  watcher: 3,
  overlord: 2,
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
 * CONFIRMADO contra a planilha e o manual oficial — jogo base.
 */
export const RESERVE_CARDS: CardDefinition[] = [
  {
    id: "mercenary",
    name: "Mercenary",
    nomePt: "Mercenário",
    descriptionPt: "Ganhe 1 Skill e 2 Swords.",
    kind: "dungeon",
    skillCost: 2,
    playEffects: { skill: 1, swords: 2 },
    verified: true,
  },
  {
    id: "explore",
    name: "Explore",
    nomePt: "Explorar",
    descriptionPt: "Ganhe 2 Skill e 1 Bota.",
    kind: "dungeon",
    skillCost: 3,
    playEffects: { skill: 2, boots: 1 },
    verified: true,
  },
  {
    id: "secret-tome",
    name: "Secret Tome",
    nomePt: "Tomo Secreto",
    descriptionPt: "Vale 7 pontos no fim de jogo.",
    kind: "dungeon",
    skillCost: 7,
    points: 7,
    verified: true,
  },
  {
    id: "goblin",
    name: "Goblin",
    nomePt: "Goblin",
    descriptionPt: "DERROTA: ganhe 1 Moeda. (Não descarte após o combate — pode ser lutado de novo.)",
    kind: "monster",
    swordCost: 2,
    acquireEffects: { gold: 1 },
    verified: true,
    // Nota: DERROTA: +1 Moeda. (Não descarte após o combate.)
  },
];

/** Quantidade inicial de cada pilha da Reserva — CONFIRMADO, jogo base. */
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
 * Segredos Maiores/Menores do manual oficial (Field Reference Guide) — CONFIRMADO,
 * inclusive nomes em português já usados pela planilha do usuário. Ainda NÃO
 * implementados no motor: não existe um sistema de tokens de sala pra Segredos (só
 * Artefatos e Ídolos de Macaco têm mecanismo de "pegar" hoje — ver `takeArtifact`/
 * `takeMonkeyIdol` em game.ts). Fica como próximo passo se o MVP precisar deles.
 */
export const MAJOR_SECRETS_REFERENCE = [
  { name: "Potion of Greater Healing", nomePt: "Cálice", effect: "Cura 2 de dano (guarda até usar)." },
  { name: "Greater Skill Boost", nomePt: "Moeda +5", effect: "Ganha 5 Skill na hora." },
  { name: "Greater Treasure", nomePt: "Cura +2", effect: "Vale 5 Gold." },
  { name: "Flash of Brilliance", nomePt: "Mana +5", effect: "Compra 3 cartas na hora." },
  { name: "Chalice", nomePt: "Cartas +3", effect: "Vale 7 pontos no fim de jogo (não é um Artefato)." },
] as const;

export const MINOR_SECRETS_REFERENCE = [
  { name: "Potion of Healing", nomePt: "Cura +1", effect: "Cura 1 de dano (guarda até usar)." },
  { name: "Potion of Swiftness", nomePt: "Bota +1", effect: "Ganha 1 Boot (guarda até usar)." },
  { name: "Potion of Strength", nomePt: "Ataque +2", effect: "Ganha 2 Swords (guarda até usar)." },
  { name: "Skill Boost", nomePt: "Mana +2", effect: "Ganha 2 Skill na hora." },
  { name: "Treasure", nomePt: "Moeda +2", effect: "Vale 2 Gold." },
  { name: "Magic Spring", effect: "No fim do turno, descarta (trash) uma carta do baralho." },
  { name: "Dragon Egg", nomePt: "Ovo de Dragão", effect: "Vale 3 pontos no fim de jogo; avança a Trilha de Fúria em 1." },
] as const;
