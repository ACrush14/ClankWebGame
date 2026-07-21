import { describe, expect, it } from "vitest";
import { BOARD } from "../src/board.js";

describe("tabuleiro", () => {
  it("a sala de entrada existe e bate com entranceRoomId", () => {
    expect(BOARD.rooms[BOARD.entranceRoomId]).toBeDefined();
    expect(BOARD.rooms[BOARD.entranceRoomId].isEntrance).toBe(true);
  });

  it("todo túnel é bidirecional (se A liga a B, B liga a A)", () => {
    for (const room of Object.values(BOARD.rooms)) {
      for (const tunnel of room.tunnels) {
        const target = BOARD.rooms[tunnel.to];
        expect(target, `sala ${tunnel.to} referenciada por ${room.id} não existe`).toBeDefined();
        const backTunnel = target.tunnels.find((t) => t.to === room.id);
        expect(backTunnel, `${target.id} não tem túnel de volta pra ${room.id}`).toBeDefined();
      }
    }
  });

  it("toda sala é alcançável a partir da entrada", () => {
    const visited = new Set<string>([BOARD.entranceRoomId]);
    const queue = [BOARD.entranceRoomId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const tunnel of BOARD.rooms[current].tunnels) {
        if (!visited.has(tunnel.to)) {
          visited.add(tunnel.to);
          queue.push(tunnel.to);
        }
      }
    }
    expect(visited.size).toBe(Object.keys(BOARD.rooms).length);
  });

  it("salas das Profundezas têm artefato com valor positivo", () => {
    const depthsRooms = Object.values(BOARD.rooms).filter((r) => r.isDepths);
    expect(depthsRooms.length).toBeGreaterThan(0);
    for (const room of depthsRooms) {
      expect(room.artifactValue ?? 0).toBeGreaterThan(0);
    }
  });
});
