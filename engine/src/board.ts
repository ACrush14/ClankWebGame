import type { BoardDefinition, RoomDefinition, Tunnel } from "./types.js";

/**
 * REVERSÃO PRO JOGO BASE + EXPANSÃO COM FOTO REAL (2026-07-24). O usuário mandou uma
 * foto de cima do tabuleiro físico de verdade (lado "Castelo", o mesmo recomendado pelo
 * manual pra primeira partida). A partir dela, confirmei e adicionei:
 * - Mais salas de Caverna de Cristal (o tabuleiro real tem bem mais de uma).
 * - 2 Artefatos novos e nítidos na foto: 20 (Escudo) e 30 (Orbe) — além dos 3 que já
 *   existiam (7/15/25). Os valores 5 e 10 devem existir em algum lugar do tabuleiro
 *   também (a escala tem 7 valores no total), mas não ficaram legíveis nessa foto —
 *   se o usuário mandar uma foto mais próxima/nítida dessas áreas, dá pra completar.
 * - **Fonte de Cura** (ícone de coração, ~3 visíveis na foto) — mecânica CONFIRMADA no
 *   manual oficial ("When you enter a room with a Fountain of Healing, heal 1 damage")
 *   que já estava documentada mas nunca tinha sido implementada — ver `isFountainOfHealing`
 *   e a lógica em `movePlayer` (game.ts).
 * - Posição mais realista do Santuário dos Macacos (a pilha visível de 3 tokens "5"
 *   idênticos, perto da área de Profundezas — bate com o "Monkey Shrine" oficial).
 * - Mercado com mais de um espaço fisicamente adjacente (a foto mostra 4 barracas de
 *   loja ao redor de um "$7" central) — modelado como 2 salas de Mercado conectadas.
 *
 * ⚠️ Ainda é uma SIMPLIFICAÇÃO, não uma cópia sala-por-sala 1:1: o tabuleiro físico
 * real tem dezenas de salas e ícones de túnel específicos em CADA ligação (muitos deles
 * com símbolo de monstro — a foto mostra esse ícone em quase todo caminho, bem mais
 * denso do que o grafo anterior assumia). Na resolução da foto não dá pra ler o número
 * exato de Swords em cada ícone de monstro individualmente, então usei custo 1 como
 * estimativa razoável nos túneis novos (os 2 túneis antigos com custo diferente, 1 e 2,
 * foram mantidos como estavam). Também existe só UM lado fotografado — o verso
 * ("Montículos e Covas") continua sem cobertura. Os `id`s internos das salas (nunca
 * aparecem pro jogador) não mudaram nas salas que já existiam, só foram adicionadas
 * salas novas — nenhum teste existente precisou ser alterado por causa disso.
 *
 * Termos que SÃO reais do jogo base (confirmados no manual oficial): "Market room",
 * "Crystal Cave", "Depths"/"Deep", "Monkey Shrine", "Fountain of Healing". Os demais
 * nomes de sala são só flavor genérico (Entrada, Corredor, Encruzilhada etc.), sem
 * correspondência com uma sala física específica.
 *
 * Regras confirmadas contra o manual oficial: ícone de pegada dupla = 2 Boots; ícone de
 * monstro num túnel = dano igual ao número, reduzível por Sword; cadeado = precisa da
 * Chave-mestra do Mercado; Mercado custa 7 Gold por item; túneis "wrap-around" custam só
 * 1 Boot (não modelados aqui como caso especial, já que o grafo não tem bordas); entrar
 * numa Caverna de Cristal esgota os Boots do turno (implementado em `movePlayer`).
 *
 * Ídolos de Macaco: RESOLVIDO (2026-07-24) via planilha do usuário — são 3 tokens
 * (Macaco Surdo/Cego/Mudo, 5 pontos cada) numa única sala "Monkey Shrine" de verdade no
 * jogo físico. Mecanismo de pegar implementado (`GameEngine.takeMonkeyIdol`,
 * `PlayerState.monkeyIdolsHeld`). Cartas que citam "se você tiver um Ídolo de Macaco"
 * (Archaeologist, Dwarven Peddler) continuam sem esse bônus condicional ligado — é um
 * efeito por carta (como `applyRoomConditionalEffects` em game.ts), fora do escopo de
 * só "ter o mecanismo de pegar o ídolo".
 *
 * Segredos Maiores/Menores (Field Reference Guide do manual): confirmados em
 * `MAJOR_SECRETS_REFERENCE`/`MINOR_SECRETS_REFERENCE` em cards.ts, mas SEM mecanismo de
 * sala implementado ainda (nenhuma sala tem token de Segredo hoje) — próximo passo se o
 * MVP precisar.
 */

/**
 * Nomes dos 7 Artefatos reais do jogo base, pela escala de valor — CONFIRMADO contra
 * fotos oficiais das cartas/tokens físicos. Tabela completa mantida aqui pra quando o
 * tabuleiro for expandido (hoje só 3 dos 7 valores estão de fato colocados em salas).
 */
export const ARTIFACT_NAMES_BY_VALUE: Record<number, string> = {
  5: "Anel",
  7: "Cruz",
  10: "Vaso",
  15: "Banana",
  20: "Escudo",
  25: "Armadura",
  30: "Orbe",
};

interface RoomSpec {
  id: string;
  name: string;
  isEntrance?: boolean;
  isMarket?: boolean;
  isDepths?: boolean;
  isCrystalCave?: boolean;
  isFountainOfHealing?: boolean;
  artifactValue?: number;
  artifactName?: string;
  monkeyIdolNames?: string[];
}

interface EdgeSpec {
  a: string;
  b: string;
  icon?: Tunnel["icon"];
  /** Só cria o túnel a→b, não o de volta (ex: um escorregador de fuga). */
  oneWay?: boolean;
}

const ROOM_SPECS: RoomSpec[] = [
  { id: "entrance", name: "Entrada da Masmorra", isEntrance: true },
  { id: "mine-entry", name: "Corredor de Pedra" },
  { id: "guard-post", name: "Posto de Vigia" },
  { id: "narrow-passage", name: "Passagem Estreita" },
  { id: "market-room", name: "Mercado", isMarket: true },
  { id: "crossroads", name: "Encruzilhada" },
  { id: "deep-tunnel", name: "Túnel Profundo" },
  { id: "crystal-cave", name: "Caverna de Cristal", isCrystalCave: true },
  { id: "depths-east", name: "Profundezas — Câmara Leste", isDepths: true, artifactValue: 15, artifactName: ARTIFACT_NAMES_BY_VALUE[15] },
  { id: "depths-west", name: "Profundezas — Câmara Oeste", isDepths: true, artifactValue: 7, artifactName: ARTIFACT_NAMES_BY_VALUE[7] },
  { id: "sealed-vault", name: "Câmara Selada", isDepths: true, artifactValue: 25, artifactName: ARTIFACT_NAMES_BY_VALUE[25] },
  { id: "monkey-shrine", name: "Santuário dos Macacos", monkeyIdolNames: ["Macaco Surdo", "Macaco Cego", "Macaco Mudo"] },

  // --- Adicionadas a partir da foto do tabuleiro físico (2026-07-24) ---
  { id: "castle-hall", name: "Salão do Castelo" },
  { id: "tower-passage", name: "Passagem da Torre" },
  { id: "crystal-cave-2", name: "Segunda Caverna de Cristal", isCrystalCave: true },
  { id: "crystal-cave-3", name: "Terceira Caverna de Cristal", isCrystalCave: true },
  { id: "market-annex", name: "Anexo do Mercado", isMarket: true },
  { id: "healing-spring-1", name: "Fonte de Cura (Superior)", isFountainOfHealing: true },
  { id: "healing-spring-2", name: "Fonte de Cura (Profundezas)", isDepths: true, isFountainOfHealing: true },
  { id: "depths-north", name: "Profundezas — Câmara Norte", isDepths: true, artifactValue: 20, artifactName: ARTIFACT_NAMES_BY_VALUE[20] },
  { id: "depths-south", name: "Profundezas — Câmara Sul", isDepths: true, artifactValue: 30, artifactName: ARTIFACT_NAMES_BY_VALUE[30] },
];

const EDGE_SPECS: EdgeSpec[] = [
  { a: "entrance", b: "mine-entry" },
  { a: "mine-entry", b: "guard-post", icon: { monsterSwordCost: 1 } },
  { a: "mine-entry", b: "narrow-passage", icon: { footprint: true } },
  { a: "guard-post", b: "market-room" },
  { a: "narrow-passage", b: "market-room" },
  { a: "narrow-passage", b: "crossroads" },
  { a: "market-room", b: "crossroads" },
  { a: "crossroads", b: "deep-tunnel", icon: { monsterSwordCost: 2 } },
  { a: "crossroads", b: "crystal-cave", icon: { footprint: true } },
  { a: "deep-tunnel", b: "depths-east", icon: { monsterSwordCost: 1 } },
  { a: "crystal-cave", b: "depths-west" },
  // Câmara Selada: precisa da Chave-mestra do Mercado pra entrar (túnel com cadeado).
  { a: "deep-tunnel", b: "sealed-vault", icon: { locked: true } },
  // Escorregador de fuga: só dá pra sair da Câmara direto pra Entrada, não pra voltar por ele.
  { a: "sealed-vault", b: "entrance", oneWay: true },
  { a: "crossroads", b: "monkey-shrine" },

  // --- Adicionadas a partir da foto do tabuleiro físico (2026-07-24) ---
  { a: "mine-entry", b: "castle-hall", icon: { monsterSwordCost: 1 } },
  { a: "castle-hall", b: "tower-passage" },
  // Atalho de mão única no topo do castelo (seta visível na foto).
  { a: "castle-hall", b: "entrance", oneWay: true },
  { a: "tower-passage", b: "market-annex", icon: { locked: true } },
  { a: "market-annex", b: "market-room" },
  { a: "guard-post", b: "healing-spring-1" },
  { a: "narrow-passage", b: "crystal-cave-2", icon: { monsterSwordCost: 1 } },
  { a: "crystal-cave-2", b: "depths-north" },
  { a: "crossroads", b: "crystal-cave-3", icon: { footprint: true } },
  { a: "crystal-cave-3", b: "deep-tunnel" },
  { a: "deep-tunnel", b: "healing-spring-2", icon: { monsterSwordCost: 1 } },
  { a: "sealed-vault", b: "depths-south", icon: { locked: true } },
];

function buildBoard(): BoardDefinition {
  const rooms: Record<string, RoomDefinition> = {};
  for (const spec of ROOM_SPECS) {
    rooms[spec.id] = {
      id: spec.id,
      name: spec.name,
      tunnels: [],
      isEntrance: spec.isEntrance,
      isMarket: spec.isMarket,
      isDepths: spec.isDepths,
      isCrystalCave: spec.isCrystalCave,
      isFountainOfHealing: spec.isFountainOfHealing,
      artifactValue: spec.artifactValue,
      artifactName: spec.artifactName,
      monkeyIdolNames: spec.monkeyIdolNames,
    };
  }
  for (const edge of EDGE_SPECS) {
    rooms[edge.a].tunnels.push({ to: edge.b, icon: edge.icon });
    if (!edge.oneWay) {
      rooms[edge.b].tunnels.push({ to: edge.a, icon: edge.icon });
    }
  }
  return { rooms, entranceRoomId: "entrance" };
}

export const BOARD: BoardDefinition = buildBoard();

export function getRoom(roomId: string): RoomDefinition {
  const room = BOARD.rooms[roomId];
  if (!room) throw new Error(`Sala desconhecida: ${roomId}`);
  return room;
}
