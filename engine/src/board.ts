import type { BoardDefinition, RoomDefinition, Tunnel } from "./types.js";

/**
 * ⚠️ Layout ainda ORIGINAL (não é uma cópia sala-por-sala do tabuleiro físico), mas os
 * ícones de túnel/Mercado foram confirmados contra uma foto real do tabuleiro oficial,
 * e os valores de artefato contra o manual oficial (PDF do rulebook):
 * - Ícone de pegada = 2 Boots; caveira num túnel = 1 Sword ou 1 dano ao passar; cadeado
 *   = precisa da Chave-mestra do Mercado; Mercado custa 7 Gold por item.
 * - Valores de artefato REAIS no jogo base variam por zona de profundidade (5/7/10/15/
 *   20/25/30); o manual dá dois exemplos exatos (7 e 25) que uso aqui pras zonas rasa
 *   e funda. `depths-west`=7 (raso, confirmado), `sealed-vault`=25 (fundo, atrás de
 *   cadeado, confirmado), `depths-east`=15 (zona intermediária — ⚠️ ainda estimativa).
 * - Trilha de Fúria: avança SEMPRE +1 por artefato pego, independente do valor —
 *   confirmado no manual (ver `takeArtifact` em game.ts; a escala em camadas que eu
 *   tinha antes, baseada numa foto, estava errada).
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
  /** Só cria o túnel a→b, não o de volta (ex: um escorregador de fuga). */
  oneWay?: boolean;
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
  { id: "depths-east", name: "Profundezas — Leste", isDepths: true, artifactValue: 15 },
  { id: "depths-west", name: "Profundezas — Oeste", isDepths: true, artifactValue: 7 },
  { id: "sealed-vault", name: "Cofre Selado", isDepths: true, artifactValue: 25 },
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
  // Cofre Selado: precisa da Chave-mestra do Mercado pra entrar (túnel com cadeado).
  { a: "deep-tunnel", b: "sealed-vault", icon: { locked: true } },
  // Escorregador de fuga: só dá pra sair do Cofre direto pra Entrada, não pra voltar por ele.
  { a: "sealed-vault", b: "entrance", oneWay: true },
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
