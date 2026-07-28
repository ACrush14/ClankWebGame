import type { BoardDefinition, RoomDefinition, Tunnel } from "./types.js";

/**
 * REVERSÃO PRO JOGO BASE + EXPANSÃO COM FOTO REAL (2026-07-24). O usuário mandou uma
 * foto de cima do tabuleiro físico de verdade (lado "Castelo", o mesmo recomendado pelo
 * manual pra primeira partida). A partir dela, confirmei e adicionei:
 * - Mais salas de Caverna de Cristal (o tabuleiro real tem bem mais de uma).
 * - Todos os 7 Artefatos agora têm sala: além dos 3 originais (7/15/25), adicionei
 *   20 (Escudo) e 30 (Orbe) nítidos na primeira foto, e depois 5 (Anel) e 10 (Vaso)
 *   confirmados pelo usuário por posição (perto da esquerda / no Mercado, respectivamente)
 *   num print anotado do jogo no Steam.
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
  majorSecret?: boolean;
  minorSecrets?: number;
}

interface EdgeSpec {
  a: string;
  b: string;
  icon?: Tunnel["icon"];
  /** Só cria o túnel a→b, não o de volta (ex: um escorregador de fuga). */
  oneWay?: boolean;
}

const ROOM_SPECS: RoomSpec[] = [
  {
    "id": "entrance",
    "name": "Entrada da Masmorra",
    "isEntrance": true
  },
  {
    "id": "room-25",
    "name": "Corredor de Pedra"
  },
  {
    "id": "room-26",
    "name": "Passagem Estreita"
  },
  {
    "id": "room-27",
    "name": "Câmara Empoeirada",
    "minorSecrets": 2
  },
  {
    "id": "room-28",
    "name": "Salão Esquecido",
    "majorSecret": true
  },
  {
    "id": "room-29",
    "name": "Recanto Oculto",
    "majorSecret": true
  },
  {
    "id": "room-30",
    "name": "Encruzilhada"
  },
  {
    "id": "room-31",
    "name": "Caverna de Cristal",
    "isCrystalCave": true
  },
  {
    "id": "room-32",
    "name": "Cripta Selada",
    "majorSecret": true
  },
  {
    "id": "room-33",
    "name": "Gruta Cristalina",
    "isCrystalCave": true
  },
  {
    "id": "room-34",
    "name": "Câmara de Cristal Escondida",
    "isCrystalCave": true,
    "majorSecret": true
  },
  {
    "id": "room-35",
    "name": "Fonte de Cura",
    "isFountainOfHealing": true
  },
  {
    "id": "room-36",
    "name": "Túnel Profundo",
    "isDepths": true
  },
  {
    "id": "room-37",
    "name": "Galeria de Pedra",
    "minorSecrets": 2
  },
  {
    "id": "room-38",
    "name": "Salão de Cristal",
    "isCrystalCave": true
  },
  {
    "id": "room-39",
    "name": "Posto de Vigia"
  },
  {
    "id": "room-40",
    "name": "Corredor dos Ecos",
    "minorSecrets": 2
  },
  {
    "id": "room-41",
    "name": "Câmara da Cruz",
    "isDepths": true,
    "artifactValue": 7
  },
  {
    "id": "room-42",
    "name": "Mercado das Profundezas",
    "isMarket": true,
    "minorSecrets": 2,
    "isDepths": true
  },
  {
    "id": "room-43",
    "name": "Mercado do Vaso",
    "isMarket": true,
    "artifactValue": 10,
    "isDepths": true
  },
  {
    "id": "room-44",
    "name": "Anexo do Mercado",
    "isMarket": true,
    "isDepths": true
  },
  {
    "id": "room-45",
    "name": "Feira Escondida",
    "isMarket": true,
    "minorSecrets": 2,
    "isDepths": true
  },
  {
    "id": "room-46",
    "name": "Gruta do Anel",
    "isCrystalCave": true,
    "artifactValue": 5,
    "isDepths": true
  },
  {
    "id": "room-47",
    "name": "Caverna da Banana",
    "isCrystalCave": true,
    "artifactValue": 15,
    "isDepths": true
  },
  {
    "id": "room-48",
    "name": "Santuário dos Macacos",
    "isDepths": true,
    "monkeyIdolNames": [
      "Macaco Surdo",
      "Macaco Cego",
      "Macaco Mudo"
    ]
  },
  {
    "id": "room-49",
    "name": "Passagem das Profundezas",
    "isDepths": true
  },
  {
    "id": "room-50",
    "name": "Câmara Sombria",
    "isDepths": true,
    "minorSecrets": 2
  },
  {
    "id": "room-51",
    "name": "Cripta Profunda",
    "isDepths": true,
    "majorSecret": true
  },
  {
    "id": "room-52",
    "name": "Salão Selado",
    "isDepths": true,
    "majorSecret": true
  },
  {
    "id": "room-53",
    "name": "Câmara do Escudo",
    "isDepths": true,
    "artifactValue": 20
  },
  {
    "id": "room-54",
    "name": "Fonte Sagrada",
    "isFountainOfHealing": true,
    "isDepths": true
  },
  {
    "id": "room-55",
    "name": "Gruta de Cristal Profunda",
    "isCrystalCave": true,
    "minorSecrets": 2,
    "isDepths": true
  },
  {
    "id": "room-56",
    "name": "Câmara da Armadura",
    "isDepths": true,
    "artifactValue": 25
  },
  {
    "id": "room-57",
    "name": "Caverna Reluzente",
    "isCrystalCave": true,
    "majorSecret": true,
    "isDepths": true
  },
  {
    "id": "room-58",
    "name": "Poço da Cura",
    "isFountainOfHealing": true,
    "isDepths": true
  },
  {
    "id": "room-59",
    "name": "Câmara do Orbe",
    "artifactValue": 30,
    "isDepths": true
  },
  {
    "id": "room-60",
    "name": "Gruta Sombria",
    "isCrystalCave": true,
    "majorSecret": true,
    "isDepths": true
  },
  {
    "id": "room-61",
    "name": "Recanto Selado",
    "majorSecret": true,
    "isDepths": true
  },
  {
    "id": "room-62",
    "name": "Caverna Silenciosa",
    "isCrystalCave": true,
    "isDepths": true
  }
];

const EDGE_SPECS: EdgeSpec[] = [
  {
    "a": "room-25",
    "b": "entrance"
  },
  {
    "a": "room-26",
    "b": "room-25"
  },
  {
    "a": "room-26",
    "b": "room-27",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-26",
    "b": "room-33"
  },
  {
    "a": "room-34",
    "b": "room-26",
    "oneWay": true,
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-27",
    "b": "room-32",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-27",
    "b": "room-31"
  },
  {
    "a": "room-27",
    "b": "room-28",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-28",
    "b": "room-31",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-29",
    "b": "room-28",
    "oneWay": true
  },
  {
    "a": "room-30",
    "b": "room-29",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-34",
    "b": "room-35",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-33",
    "b": "room-37",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-33",
    "b": "room-38",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-32",
    "b": "room-38",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-31",
    "b": "room-30",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-31",
    "b": "room-39",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-30",
    "b": "room-40"
  },
  {
    "a": "room-35",
    "b": "room-36",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-37",
    "b": "room-36",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-37",
    "b": "room-46"
  },
  {
    "a": "room-46",
    "b": "room-38",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-45",
    "b": "room-38",
    "icon": {
      "monsterSwordCost": 2
    }
  },
  {
    "a": "room-39",
    "b": "room-38"
  },
  {
    "a": "room-39",
    "b": "room-40"
  },
  {
    "a": "room-40",
    "b": "room-41"
  },
  {
    "a": "room-39",
    "b": "room-41",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-36",
    "b": "room-62"
  },
  {
    "a": "room-36",
    "b": "room-48",
    "oneWay": true,
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-36",
    "b": "room-47"
  },
  {
    "a": "room-36",
    "b": "room-46"
  },
  {
    "a": "room-46",
    "b": "room-51",
    "icon": {
      "footprint": true,
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-46",
    "b": "room-44"
  },
  {
    "a": "room-45",
    "b": "room-44"
  },
  {
    "a": "room-42",
    "b": "room-43"
  },
  {
    "a": "room-42",
    "b": "room-41"
  },
  {
    "a": "room-42",
    "b": "room-60",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-41",
    "b": "room-62"
  },
  {
    "a": "room-62",
    "b": "room-61",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-48",
    "b": "room-47",
    "oneWay": true
  },
  {
    "a": "room-48",
    "b": "room-49",
    "oneWay": true
  },
  {
    "a": "room-50",
    "b": "room-48",
    "oneWay": true,
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-51",
    "b": "room-44",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-44",
    "b": "room-50",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-44",
    "b": "room-53",
    "icon": {
      "monsterSwordCost": 2
    }
  },
  {
    "a": "room-44",
    "b": "room-43"
  },
  {
    "a": "room-43",
    "b": "room-55",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-58",
    "b": "room-60",
    "oneWay": true
  },
  {
    "a": "room-61",
    "b": "room-59",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-49",
    "b": "room-50"
  },
  {
    "a": "room-50",
    "b": "room-53",
    "icon": {
      "monsterSwordCost": 2
    }
  },
  {
    "a": "room-52",
    "b": "room-53",
    "icon": {
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-53",
    "b": "room-54",
    "icon": {
      "footprint": true
    }
  },
  {
    "a": "room-53",
    "b": "room-55",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-55",
    "b": "room-56",
    "icon": {
      "monsterSwordCost": 2
    }
  },
  {
    "a": "room-56",
    "b": "room-58",
    "icon": {
      "footprint": true,
      "monsterSwordCost": 1
    }
  },
  {
    "a": "room-56",
    "b": "room-57"
  },
  {
    "a": "room-49",
    "b": "room-52",
    "icon": {
      "locked": true
    }
  },
  {
    "a": "room-54",
    "b": "room-56",
    "icon": {
      "monsterSwordCost": 2
    }
  },
  {
    "a": "room-54",
    "b": "room-57",
    "icon": {
      "footprint": true,
      "monsterSwordCost": 1
    }
  }
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
      // Deriva o nome automaticamente de ARTIFACT_NAMES_BY_VALUE quando o spec não seta um
      // explicitamente — os specs novos (2026-07-28, ferramenta de anotação) só trazem o
      // valor numérico, então sem isso `artifactName` ficava undefined em toda sala nova.
      artifactName: spec.artifactName ?? (spec.artifactValue !== undefined ? ARTIFACT_NAMES_BY_VALUE[spec.artifactValue] : undefined),
      monkeyIdolNames: spec.monkeyIdolNames,
      majorSecret: spec.majorSecret,
      minorSecrets: spec.minorSecrets,
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
