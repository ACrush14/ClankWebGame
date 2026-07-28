import { BOARD } from "@clank/engine";
import boardPhoto from "../assets/board/ClankBoardCastle.jpg";
import { artifactImageUrl } from "./tokenImages";

/**
 * Layout manual (x, y em coordenadas do viewBox) — o layout do BOARD (engine/src/board.ts)
 * ainda não é uma cópia sala-por-sala do tabuleiro físico, então este mapa segue a mesma
 * topologia em camadas (entrada no topo, profundezas embaixo) em vez de tentar recriar o
 * layout exato impresso no tabuleiro oficial. A foto do tabuleiro físico (placeholder
 * autorizado pelo usuário) entra só como pano de fundo atmosférico atrás do grafo
 * esquemático — não há alinhamento pixel-a-pixel entre os círculos e as salas da foto.
 */
const ROOM_POSITIONS: Record<string, { x: number; y: number }> = {
  "entrance": {
    "x": 70,
    "y": 56
  },
  "room-25": {
    "x": 75,
    "y": 153
  },
  "room-26": {
    "x": 250,
    "y": 156
  },
  "room-27": {
    "x": 419,
    "y": 158
  },
  "room-28": {
    "x": 585,
    "y": 158
  },
  "room-29": {
    "x": 765,
    "y": 129
  },
  "room-30": {
    "x": 743,
    "y": 269
  },
  "room-31": {
    "x": 580,
    "y": 328
  },
  "room-32": {
    "x": 426,
    "y": 301
  },
  "room-33": {
    "x": 289,
    "y": 306
  },
  "room-34": {
    "x": 110,
    "y": 283
  },
  "room-35": {
    "x": 84,
    "y": 428
  },
  "room-36": {
    "x": 107,
    "y": 566
  },
  "room-37": {
    "x": 226,
    "y": 449
  },
  "room-38": {
    "x": 417,
    "y": 461
  },
  "room-39": {
    "x": 592,
    "y": 462
  },
  "room-40": {
    "x": 761,
    "y": 424
  },
  "room-41": {
    "x": 768,
    "y": 548
  },
  "room-42": {
    "x": 625,
    "y": 610
  },
  "room-43": {
    "x": 641,
    "y": 775
  },
  "room-44": {
    "x": 446,
    "y": 768
  },
  "room-45": {
    "x": 439,
    "y": 599
  },
  "room-46": {
    "x": 282,
    "y": 590
  },
  "room-47": {
    "x": 190,
    "y": 679
  },
  "room-48": {
    "x": 83,
    "y": 815
  },
  "room-49": {
    "x": 123,
    "y": 1003
  },
  "room-50": {
    "x": 259,
    "y": 883
  },
  "room-51": {
    "x": 279,
    "y": 782
  },
  "room-52": {
    "x": 326,
    "y": 1008
  },
  "room-53": {
    "x": 423,
    "y": 894
  },
  "room-54": {
    "x": 523,
    "y": 1020
  },
  "room-55": {
    "x": 574,
    "y": 910
  },
  "room-56": {
    "x": 736,
    "y": 934
  },
  "room-57": {
    "x": 899,
    "y": 999
  },
  "room-58": {
    "x": 857,
    "y": 816
  },
  "room-59": {
    "x": 986,
    "y": 863
  },
  "room-60": {
    "x": 771,
    "y": 706
  },
  "room-61": {
    "x": 986,
    "y": 735
  },
  "room-62": {
    "x": 910,
    "y": 587
  }
};

export interface BoardMapPlayer {
  id: string;
  name: string;
  color: string;
  roomId: string;
  knockedOut: boolean;
  hasLeftDungeon: boolean;
}

interface BoardMapProps {
  players: BoardMapPlayer[];
  claimedArtifacts: Record<string, boolean>;
  currentRoomId?: string;
  onRoomClick?: (roomId: string) => void;
  /** Ids de sala pra onde dá pra mover agora (recebem destaque + ficam clicáveis). */
  reachableRoomIds?: Set<string>;
}

function roomFill(room: (typeof BOARD.rooms)[string], isCurrent: boolean) {
  if (isCurrent) return "#f59e0b";
  if (room.isEntrance) return "#10b981";
  if (room.isMarket) return "#eab308";
  if (room.isFountainOfHealing) return "#f43f5e";
  if (room.isDepths) return "#8b5cf6";
  return "#334155";
}

export function BoardMap({ players, claimedArtifacts, currentRoomId, onRoomClick, reachableRoomIds }: BoardMapProps) {
  const rooms = Object.values(BOARD.rooms);
  const edges: { from: string; to: string; icon?: { monsterSwordCost?: number; footprint?: boolean; locked?: boolean }; oneWay?: boolean }[] = [];
  const seen = new Set<string>();
  for (const room of rooms) {
    for (const tunnel of room.tunnels) {
      const key = [room.id, tunnel.to].sort().join("|");
      const reverseHasSame = BOARD.rooms[tunnel.to]?.tunnels.some((t) => t.to === room.id);
      if (reverseHasSame) {
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: room.id, to: tunnel.to, icon: tunnel.icon });
      } else {
        edges.push({ from: room.id, to: tunnel.to, icon: tunnel.icon, oneWay: true });
      }
    }
  }

  const playersByRoom = new Map<string, BoardMapPlayer[]>();
  for (const p of players) {
    if (p.hasLeftDungeon) continue;
    const list = playersByRoom.get(p.roomId) ?? [];
    list.push(p);
    playersByRoom.set(p.roomId, list);
  }

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: "1200 / 1200" }}>
      <img
        src={boardPhoto}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain opacity-40"
      />
      <div className="absolute inset-0 bg-slate-950/45" />
      <svg
        viewBox="0 0 1200 1200"
        className="absolute inset-0 h-full w-full select-none"
        role="img"
        aria-label="Mapa da masmorra"
      >
      {edges.map((edge, i) => {
        const a = ROOM_POSITIONS[edge.from];
        const b = ROOM_POSITIONS[edge.to];
        if (!a || !b) return null;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        return (
          <g key={`${edge.from}-${edge.to}-${i}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={edge.icon?.locked ? "#fbbf24" : "#475569"}
              strokeWidth={2}
              strokeDasharray={edge.oneWay ? "6 4" : undefined}
            />
            {edge.icon?.monsterSwordCost && (
              <text x={midX} y={midY - 4} textAnchor="middle" fontSize={13}>
                👹{edge.icon.monsterSwordCost}⚔
              </text>
            )}
            {edge.icon?.footprint && (
              <text x={midX} y={midY - 4} textAnchor="middle" fontSize={13}>
                👣2
              </text>
            )}
            {edge.icon?.locked && (
              <text x={midX} y={midY - 4} textAnchor="middle" fontSize={13}>
                🔒
              </text>
            )}
          </g>
        );
      })}

      {rooms.map((room) => {
        const pos = ROOM_POSITIONS[room.id];
        if (!pos) return null;
        const isCurrent = room.id === currentRoomId;
        const isReachable = reachableRoomIds?.has(room.id) ?? false;
        const hasArtifact = !!room.artifactValue && !claimedArtifacts[room.id];
        const occupants = playersByRoom.get(room.id) ?? [];

        return (
          <g
            key={room.id}
            onClick={onRoomClick && isReachable ? () => onRoomClick(room.id) : undefined}
            style={{ cursor: onRoomClick && isReachable ? "pointer" : "default" }}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isCurrent ? 26 : 22}
              fill={roomFill(room, isCurrent)}
              stroke={isReachable ? "#f8fafc" : "none"}
              strokeWidth={isReachable ? 2 : 0}
              opacity={isCurrent ? 1 : 0.9}
            />
            {hasArtifact && artifactImageUrl(room.artifactValue!) && (
              <image
                href={artifactImageUrl(room.artifactValue!)}
                x={pos.x - 14}
                y={pos.y - 14}
                width={28}
                height={28}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            {hasArtifact && (
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#fef3c7" stroke="#0f172a" strokeWidth={3} paintOrder="stroke">
                {room.artifactValue}
              </text>
            )}
            {room.isMarket && !hasArtifact && (
              <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={14}>
                🏪
              </text>
            )}
            {room.isEntrance && (
              <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={14}>
                🚪
              </text>
            )}
            <text x={pos.x} y={pos.y + 38} textAnchor="middle" fontSize={9} fill="#cbd5e1">
              {room.name}
            </text>
            {occupants.map((p, idx) => (
              <circle
                key={p.id}
                cx={pos.x - 14 + idx * 12}
                cy={pos.y - 22}
                r={6}
                fill={p.knockedOut ? "#7f1d1d" : p.color}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
            ))}
          </g>
        );
      })}
      </svg>
    </div>
  );
}
