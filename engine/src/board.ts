import type { BoardDefinition, RoomDefinition, Tunnel } from "./types.js";

/**
 * REVERSÃO PRO JOGO BASE (2026-07-24): nomes de sala re-temados do Clank! Catacombs pro
 * **Clank! A Deck-Building Adventure** (jogo base). ⚠️ Segue sendo um grafo FIXO e
 * pequeno de salas — decisão consciente de não copiar sala-por-sala o tabuleiro físico
 * real (que tem ~40 salas, dois lados diferentes — "Castelo" e "Montículos e Covas" — e
 * túneis com ícones específicos em cada ligação). Os `id`s internos das salas são só
 * identificadores técnicos (nunca aparecem pro jogador) e não mudaram nesta reversão.
 *
 * Termos que SÃO reais do jogo base (confirmados no manual oficial): "Market room",
 * "Crystal Cave", "Depths"/"Deep", "Monkey Shrine". Os demais nomes de sala são só
 * flavor genérico (Entrada, Corredor, Encruzilhada etc.), sem correspondência com uma
 * sala física específica.
 *
 * Se/quando o usuário mandar uma foto do tabuleiro físico (frente e verso), dá pra
 * reconstruir a topologia de verdade — até lá, isto é uma simplificação suficiente pro
 * MVP (jogo completo, básico, sem elaboração excessiva — ver PLANNING.md).
 *
 * Regras confirmadas contra o manual oficial: ícone de pegada dupla = 2 Boots; ícone de
 * monstro num túnel = dano igual ao número, reduzível por Sword; cadeado = precisa da
 * Chave-mestra do Mercado; Mercado custa 7 Gold por item; túneis "wrap-around" custam só
 * 1 Boot (não modelados aqui como caso especial, já que o grafo não tem bordas).
 *
 * Valores de Artefato: CONFIRMADOS via planilha do usuário cruzada com fotos oficiais —
 * a escala completa do jogo base tem 7 valores E 7 nomes (ver `ARTIFACT_NAMES_BY_VALUE`
 * abaixo). Só 3 das 7 posições estão de fato colocadas em salas hoje (7/15/25).
 *
 * Ídolos de Macaco: RESOLVIDO (2026-07-24) via planilha do usuário — são 3 tokens
 * (Macaco Surdo/Cego/Mudo, 5 pontos cada) numa única sala "Monkey Shrine" de verdade no
 * jogo físico. Mecanismo de pegar implementado (`GameEngine.takeMonkeyIdol`,
 * `PlayerState.monkeyIdolsHeld`) — a posição/ligação dela no grafo abaixo é provisória
 * (só pra deixar testável); a posição real no tabuleiro físico ainda não foi conferida.
 * Cartas que citam "se você tiver um Ídolo de Macaco" (Archaeologist, Dwarven Peddler)
 * continuam sem esse bônus condicional ligado — é um efeito por carta (como
 * `applyRoomConditionalEffects` em game.ts), fora do escopo de só "ter o mecanismo de
 * pegar o ídolo".
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
  // Posição provisória (ligada à Encruzilhada) — o jogo físico tem uma única sala
  // "Monkey Shrine" com os 3 Ídolos juntos. Ver EDGE_SPECS abaixo.
  { id: "monkey-shrine", name: "Santuário dos Macacos", monkeyIdolNames: ["Macaco Surdo", "Macaco Cego", "Macaco Mudo"] },
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
