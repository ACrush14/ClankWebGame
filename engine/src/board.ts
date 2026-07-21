import type { BoardDefinition, RoomDefinition, Tunnel } from "./types.js";

/**
 * ⚠️ Layout ORIGINAL, não é reprodução do tabuleiro físico oficial — não tenho acesso
 * a fotos/escaneamento do tabuleiro real do Clank! (seria necessário pra reproduzir a
 * posição exata das salas). Este é um grafo de mina desenhado por mim, seguindo a
 * mesma estrutura mecânica das regras confirmadas: entrada no topo, túneis com ícone
 * de monstro (paga Swords ou leva dano) ou de pegada (custa 2 Boots), uma sala de
 * Mercado, e duas salas nas Profundezas com artefato pra pegar.
 */

interface RoomSpec {
  id: string;
  name: string;
  isEntrance?: boolean;
  isMarket?: boolean;
  isDepths?: boolean;
  artifactValue?: number;
}

interface EdgeSpec {
  a: string;
  b: string;
  icon?: Tunnel["icon"];
}

const ROOM_SPECS: RoomSpec[] = [
  { id: "entrance", name: "Entrada da Mina", isEntrance: true },
  { id: "mine-entry", name: "Boca da Mina" },
  { id: "guard-post", name: "Posto de Guarda" },
  { id: "narrow-passage", name: "Passagem Estreita" },
  { id: "market-room", name: "Mercado", isMarket: true },
  { id: "crossroads", name: "Encruzilhada" },
  { id: "deep-tunnel", name: "Túnel Profundo" },
  { id: "crystal-cave", name: "Caverna de Cristal" },
  { id: "depths-east", name: "Profundezas — Leste", isDepths: true, artifactValue: 10 },
  { id: "depths-west", name: "Profundezas — Oeste", isDepths: true, artifactValue: 6 },
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
      artifactValue: spec.artifactValue,
    };
  }
  for (const edge of EDGE_SPECS) {
    rooms[edge.a].tunnels.push({ to: edge.b, icon: edge.icon });
    rooms[edge.b].tunnels.push({ to: edge.a, icon: edge.icon });
  }
  return { rooms, entranceRoomId: "entrance" };
}

export const BOARD: BoardDefinition = buildBoard();

export function getRoom(roomId: string): RoomDefinition {
  const room = BOARD.rooms[roomId];
  if (!room) throw new Error(`Sala desconhecida: ${roomId}`);
  return room;
}
