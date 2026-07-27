import { describe, expect, it } from "vitest";
import { BOARD } from "../src/board.js";

describe("tabuleiro", () => {
  it("a sala de entrada existe e bate com entranceRoomId", () => {
    expect(BOARD.rooms[BOARD.entranceRoomId]).toBeDefined();
    expect(BOARD.rooms[BOARD.entranceRoomId].isEntrance).toBe(true);
  });

  it("todo túnel é bidirecional, exceto os de mão única conhecidos", () => {
    const oneWayExceptions = new Set(["sealed-vault->entrance", "castle-hall->entrance"]);
    for (const room of Object.values(BOARD.rooms)) {
      for (const tunnel of room.tunnels) {
        const target = BOARD.rooms[tunnel.to];
        expect(target, `sala ${tunnel.to} referenciada por ${room.id} não existe`).toBeDefined();
        if (oneWayExceptions.has(`${room.id}->${tunnel.to}`)) continue;
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

  it("salas das Profundezas com artefato têm valor positivo (nem toda sala de Profundezas precisa ter um — pode ter só uma Fonte de Cura, por exemplo)", () => {
    const depthsRooms = Object.values(BOARD.rooms).filter((r) => r.isDepths);
    expect(depthsRooms.length).toBeGreaterThan(0);
    const withArtifact = depthsRooms.filter((r) => r.artifactValue !== undefined);
    expect(withArtifact.length).toBeGreaterThan(0);
    for (const room of withArtifact) {
      expect(room.artifactValue ?? 0).toBeGreaterThan(0);
    }
  });
});
