import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "Jogador";
  @type("boolean") connected = true;
  @type("boolean") ready = false;
}

export class ClankRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: "lobby" | "playing" = "lobby";
  @type(["string"]) log = new ArraySchema<string>();
}

const MAX_PLAYERS = 4;
const MAX_LOG_LINES = 30;

export class ClankRoom extends Room<ClankRoomState> {
  maxClients = MAX_PLAYERS;

  onCreate() {
    this.setState(new ClankRoomState());

    this.onMessage("set_name", (client, name: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const clean = String(name ?? "").trim().slice(0, 20);
      if (clean.length === 0) return;
      player.name = clean;
      this.pushLog(`${clean} entrou na sala.`);
    });

    this.onMessage("toggle_ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.ready = !player.ready;
      this.pushLog(`${player.name} está ${player.ready ? "pronto" : "não pronto"}.`);
    });

    this.onMessage("start_game", () => {
      if (this.state.phase !== "lobby") return;
      this.state.phase = "playing";
      this.pushLog("A partida começou.");
    });

    console.log(`ClankRoom criada: ${this.roomId}`);
  }

  onJoin(client: Client) {
    const player = new Player();
    player.name = `Jogador ${this.state.players.size + 1}`;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = false;
    this.pushLog(`${player.name} saiu da sala.`);

    if (consented) {
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose() {
    console.log(`ClankRoom encerrada: ${this.roomId}`);
  }

  private pushLog(line: string) {
    this.state.log.push(line);
    while (this.state.log.length > MAX_LOG_LINES) {
      this.state.log.shift();
    }
  }
}
