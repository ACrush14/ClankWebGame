import { BOARD } from "@clank/engine";

/**
 * Layout manual (x, y em coordenadas do viewBox) — o layout do BOARD (engine/src/board.ts)
 * ainda não é uma cópia sala-por-sala do tabuleiro físico, então este mapa segue a mesma
 * topologia em camadas (entrada no topo, profundezas embaixo) em vez de tentar recriar o
 * layout exato impresso no tabuleiro oficial.
 */
const ROOM_POSITIONS: Record<string, { x: number; y: number }> = {
  entrance: { x: 200, y: 40 },
  "mine-entry": { x: 200, y: 120 },
  "guard-post": { x: 90, y: 200 },
  "narrow-passage": { x: 310, y: 200 },
  "market-room": { x: 200, y: 270 },
  crossroads: { x: 200, y: 340 },
  "deep-tunnel": { x: 110, y: 410 },
  "crystal-cave": { x: 290, y: 410 },
  "depths-east": { x: 70, y: 490 },
  "sealed-vault": { x: 200, y: 490 },
  "depths-west": { x: 330, y: 490 },
  "monkey-shrine": { x: 320, y: 340 },
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
    <svg viewBox="0 0 400 560" className="w-full select-none" role="img" aria-label="Mapa da masmorra">
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
            {hasArtifact && (
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#fef3c7">
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
  );
}
