import type { BoardDefinition, RoomDefinition, Tunnel } from "./types.js";

/**
 * ⚠️ Layout ainda ORIGINAL (não é uma cópia sala-por-sala de nenhum tabuleiro físico) —
 * os `id`s internos das salas não mudaram (são só identificadores técnicos, nunca
 * aparecem pro jogador), mas os NOMES exibidos foram re-temados pro **Clank! Catacombs**
 * (2026-07-21), já que o conteúdo de cartas do projeto vem de lá (ver cards.ts): "Crystal
 * Cave", "Market room", "Wayshrine" e "Depths"/"Deep" são termos reais confirmados no
 * texto oficial de várias cartas (Lie in Wait, Astral Projection, Waystone, Robbery, The
 * Warden etc.); "Prisioneiros" e criptas são um nod temático ao roster de monstros
 * esqueleto e às cartas que libertam prisioneiros (Diversion, Riot, The Warden).
 *
 * O Catacombs de verdade usa um tabuleiro MODULAR (ladrilhos quadrados colocados/
 * rotacionados durante o jogo — ver cartas como Dusty Map, Marble Guardian, Sudden
 * Movement, Animated Wall) — isso NÃO foi implementado aqui, decisão consciente pra não
 * reescrever a arquitetura do motor. Isto continua sendo um grafo fixo de salas, só com
 * nomes/tema do Catacombs.
 *
 * Regras que continuam confirmadas contra fontes reais (jogo básico, mecânica
 * compartilhada com o Catacombs): ícone de pegada = 2 Boots; caveira num túnel = 1 Sword
 * ou 1 dano ao passar; cadeado = precisa da Chave-mestra do Mercado; Mercado custa 7 Gold
 * por item.
 *
 * Valores de artefato: CONFIRMADOS contra uma foto real dos tokens físicos de artefato do
 * Clank! Catacombs (2026-07-21) — a escala completa do jogo tem 7 valores: 5, 7, 10, 15,
 * 20, 25 e 30. Os três usados aqui (`depths-west`=7, `depths-east`=15, `sealed-vault`=25)
 * já batiam com essa escala real (eram herdados do manual do jogo básico, que por
 * coincidência usa os mesmos números nessas três posições).
 *
 * ⚠️ Mecânicas do Catacombs ainda por confirmar/implementar: você jogou uma versão sem
 * prisioneiros/fantasmas (as cartas que citam isso — Diversion, Riot, The Warden, White/
 * Black Tourmaline — ficam sem esse efeito condicional aplicado), mas com "cabines da
 * masmorra" (ainda não sei a que se refere exatamente — não modelado), Cavernas de
 * Cristal (já existe, ver `isCrystalCave` abaixo) e Ídolos de Macaco (citados em "Boots
 * of the Ape Lord"/"Thirst for Adventure", mas eu não sei ainda ONDE/COMO se consegue um
 * — sem isso não dá pra implementar a aquisição, só a checagem "se você tiver".
 */

interface RoomSpec {
  id: string;
  name: string;
  isEntrance?: boolean;
  isMarket?: boolean;
  isDepths?: boolean;
  isCrystalCave?: boolean;
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
  { id: "entrance", name: "Entrada da Masmorra", isEntrance: true },
  { id: "mine-entry", name: "Corredor de Pedra" },
  { id: "guard-post", name: "Posto dos Esqueletos" },
  { id: "narrow-passage", name: "Wayshrine Esquecido" },
  { id: "market-room", name: "Mercado", isMarket: true },
  { id: "crossroads", name: "Encruzilhada das Criptas" },
  { id: "deep-tunnel", name: "Túnel dos Prisioneiros" },
  { id: "crystal-cave", name: "Caverna de Cristal", isCrystalCave: true },
  { id: "depths-east", name: "Profundezas — Cripta Leste", isDepths: true, artifactValue: 15 },
  { id: "depths-west", name: "Profundezas — Cripta Oeste", isDepths: true, artifactValue: 7 },
  { id: "sealed-vault", name: "Câmara Selada", isDepths: true, artifactValue: 25 },
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
