import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { GameEngine } from "@clank/engine";

/** Paleta fixa de cores por jogador — sem arte oficial, só blocos de cor + inicial. */
const PLAYER_COLORS = ["#38bdf8", "#f472b6", "#a3e635", "#fb923c", "#a78bfa", "#2dd4bf"];

export class Player extends Schema {
  @type("string") name = "Jogador";
  @type("string") color = PLAYER_COLORS[0];
  @type("boolean") connected = true;
  /** Só usado na fase de lobby. */
  @type("boolean") ready = false;

  // Estado de jogo (populado quando phase vira "playing")
  @type("boolean") knockedOut = false;
  @type("number") handCount = 0;
  @type("number") drawPileCount = 0;
  @type("number") discardPileCount = 0;
  @type("number") skill = 0;
  @type("number") swords = 0;
  @type("number") boots = 0;
  @type("number") gold = 0;
  @type("number") clank = 0;
  @type("number") damage = 0;
  @type("string") roomId = "";
  @type("number") points = 0;
  @type("number") artifactsCarried = 0;
  @type("number") monkeyIdolsHeld = 0;
  @type("boolean") hasMasterKey = false;
  @type("boolean") hasBackpack = false;
  @type("boolean") hasLeftDungeon = false;
  @type("number") finalScore = -1;
}

export class ClankRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: "lobby" | "playing" | "ended" = "lobby";
  @type(["string"]) log = new ArraySchema<string>();

  // Estado de jogo público (visível a todos — mãos são privadas, ver mensagem "hand")
  @type("string") currentPlayerId = "";
  @type("number") turnNumber = 0;
  /** 5 posições; "" representa slot vazio (ArraySchema não aceita null). */
  @type(["string"]) dungeonRowSlots = new ArraySchema<string>();
  @type({ map: "number" }) reserveRemaining = new MapSchema<number>();
  @type("number") dragonRageTrack = 1;
  /** Ids de sala cujo artefato já foi pego (o tabuleiro em si é estático — vem de @clank/engine no cliente). */
  @type({ map: "boolean" }) claimedArtifacts = new MapSchema<boolean>();
  /** Nomes de Ídolo de Macaco já pegos (ex: "Macaco Surdo") — únicos no jogo todo. */
  @type({ map: "boolean" }) claimedMonkeyIdols = new MapSchema<boolean>();
  @type("number") countdownTrack = 0;
  /** Id do jogador que anda na Trilha de Contagem Regressiva (só ele — regra oficial); "" = ninguém ainda. */
  @type("string") countdownPlayerId = "";
  @type("boolean") marketKeyAvailable = true;
  @type("boolean") marketBackpackAvailable = true;
  @type(["number"]) marketCrownsAvailable = new ArraySchema<number>();
  /**
   * Escolha "X -OU- Y" pendente do jogador da vez (ex: Shrine "USE: $1 -OU- cura 1"),
   * serializada como JSON (`{cardName, options:[{icon,amount,label}]}`) — "" quando não
   * há nenhuma pendente. JSON simples em vez de um schema aninhado pra manter isso leve.
   */
  @type("string") pendingChoiceJson = "";
}

const MAX_PLAYERS = 4;
const MAX_LOG_LINES = 30;

export class ClankRoom extends Room<ClankRoomState> {
  maxClients = MAX_PLAYERS;
  private engine: GameEngine | null = null;
  private lastEngineLogIndex = 0;

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

    this.onMessage("set_color", (client, color: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || this.state.phase !== "lobby") return;
      if (!PLAYER_COLORS.includes(color)) return;
      player.color = color;
    });

    this.onMessage("toggle_ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.ready = !player.ready;
      this.pushLog(`${player.name} está ${player.ready ? "pronto" : "não pronto"}.`);
    });

    this.onMessage("start_game", (client) => this.handleStartGame(client));
    this.onMessage("play_card", (client, cardId: string) =>
      this.handleAction(client, () => this.engine!.playCard(client.sessionId, cardId)),
    );
    this.onMessage("acquire_card", (client, slotIndex: number) =>
      this.handleAction(client, () => this.engine!.acquireCard(client.sessionId, slotIndex)),
    );
    this.onMessage("fight_monster", (client, slotIndex: number) =>
      this.handleAction(client, () => this.engine!.fightMonster(client.sessionId, slotIndex)),
    );
    this.onMessage("acquire_from_reserve", (client, cardId: string) =>
      this.handleAction(client, () => this.engine!.acquireFromReserve(client.sessionId, cardId)),
    );
    this.onMessage("move_player", (client, toRoomId: string) =>
      this.handleAction(client, () => this.engine!.movePlayer(client.sessionId, toRoomId)),
    );
    this.onMessage("take_artifact", (client) =>
      this.handleAction(client, () => this.engine!.takeArtifact(client.sessionId)),
    );
    this.onMessage("take_monkey_idol", (client) =>
      this.handleAction(client, () => this.engine!.takeMonkeyIdol(client.sessionId)),
    );
    this.onMessage("leave_dungeon", (client) =>
      this.handleAction(client, () => this.engine!.leaveDungeon(client.sessionId)),
    );
    this.onMessage("buy_market_item", (client, item: "key" | "backpack" | "crown") =>
      this.handleAction(client, () => this.engine!.buyMarketItem(client.sessionId, item)),
    );
    this.onMessage("end_turn", (client) => this.handleAction(client, () => this.engine!.endTurn(client.sessionId)));
    this.onMessage("resolve_choice", (client, optionIndex: number) =>
      this.handleAction(client, () => this.engine!.resolveChoice(client.sessionId, optionIndex)),
    );

    console.log(`ClankRoom criada: ${this.roomId}`);
  }

  onJoin(client: Client) {
    const player = new Player();
    player.name = `Jogador ${this.state.players.size + 1}`;
    player.color = PLAYER_COLORS[this.state.players.size % PLAYER_COLORS.length];
    this.state.players.set(client.sessionId, player);
  }

  /**
   * Se o cliente saiu por vontade própria (fechou/clicou "Sair"), remove o assento de
   * vez. Se foi queda de conexão (aba fechada sem querer, rede caiu), guarda o assento
   * por 2 minutos — o cliente reconecta com o mesmo `sessionId` (mesma mão, recursos,
   * posição no tabuleiro etc.) via `client.reconnect(token)`, sem precisar recriar a
   * sala nem perder o progresso da partida em andamento.
   */
  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = false;
    this.pushLog(`${player.name} saiu da sala.`);

    if (consented) {
      this.state.players.delete(client.sessionId);
      return;
    }

    try {
      await this.allowReconnection(client, 120);
      player.connected = true;
      this.pushLog(`${player.name} reconectou.`);
      // A mão é privada (não faz parte do schema sincronizado) — precisa ser reenviada
      // na reconexão, já que `onJoin` não roda de novo pra um cliente que só reconectou.
      if (this.engine) this.sendHand(client.sessionId);
    } catch {
      this.pushLog(`${player.name} não reconectou a tempo.`);
    }
  }

  onDispose() {
    console.log(`ClankRoom encerrada: ${this.roomId}`);
  }

  private handleStartGame(client: Client) {
    if (this.state.phase !== "lobby") return;

    const connected = [...this.state.players.entries()].filter(([, p]) => p.connected);
    if (connected.length < 1) return;
    if (!connected.every(([, p]) => p.ready)) {
      client.send("error", "Nem todo mundo está pronto ainda.");
      return;
    }

    try {
      this.engine = new GameEngine(connected.map(([id, p]) => ({ id, name: p.name })));
      this.lastEngineLogIndex = 0;
      this.state.phase = "playing";
      this.pushLog("A partida começou.");
      this.syncFromEngine();
      for (const [sessionId] of connected) this.sendHand(sessionId);
    } catch (err) {
      this.engine = null;
      this.state.phase = "lobby";
      client.send("error", err instanceof Error ? err.message : "Não foi possível começar a partida.");
    }
  }

  /** Roda uma ação do motor de regras; converte erros de regra em mensagem pro cliente, sem derrubar a sala. */
  private handleAction(client: Client, action: () => void) {
    if (!this.engine) {
      client.send("error", "A partida ainda não começou.");
      return;
    }
    try {
      action();
      this.syncFromEngine();
      this.sendHand(client.sessionId);
    } catch (err) {
      client.send("error", err instanceof Error ? err.message : "Ação inválida.");
    }
  }

  private sendHand(sessionId: string) {
    const player = this.engine?.state.players.find((p) => p.id === sessionId);
    if (!player) return;
    const client = this.clients.find((c) => c.sessionId === sessionId);
    client?.send("hand", player.hand);
  }

  private syncFromEngine() {
    if (!this.engine) return;
    const state = this.engine.state;

    this.state.turnNumber = state.turnNumber;
    this.state.currentPlayerId = state.players[state.currentPlayerIndex]?.id ?? "";
    this.state.dragonRageTrack = state.dragon.rageTrackPosition;
    this.state.countdownTrack = state.countdownTrack;
    this.state.countdownPlayerId = state.countdownPlayerId ?? "";
    this.state.marketKeyAvailable = state.market.masterKeyAvailable;
    this.state.marketBackpackAvailable = state.market.backpackAvailable;
    this.state.marketCrownsAvailable.clear();
    for (const value of state.market.crownsAvailable) this.state.marketCrownsAvailable.push(value);
    if (state.phase === "ended") this.state.phase = "ended";
    this.state.pendingChoiceJson = state.pendingChoice ? JSON.stringify(state.pendingChoice) : "";

    this.state.dungeonRowSlots.clear();
    for (const id of state.dungeonRow.slots) this.state.dungeonRowSlots.push(id ?? "");

    for (const [id, count] of Object.entries(state.reserve.remaining)) {
      this.state.reserveRemaining.set(id, count);
    }

    for (const [roomId, claimed] of Object.entries(state.claimedArtifacts)) {
      this.state.claimedArtifacts.set(roomId, claimed);
    }

    for (const [idolName, claimed] of Object.entries(state.claimedMonkeyIdols)) {
      this.state.claimedMonkeyIdols.set(idolName, claimed);
    }

    for (const enginePlayer of state.players) {
      const schemaPlayer = this.state.players.get(enginePlayer.id);
      if (!schemaPlayer) continue;
      schemaPlayer.knockedOut = enginePlayer.knockedOut;
      schemaPlayer.handCount = enginePlayer.hand.length;
      schemaPlayer.drawPileCount = enginePlayer.drawPile.length;
      schemaPlayer.discardPileCount = enginePlayer.discardPile.length;
      schemaPlayer.skill = enginePlayer.resources.skill;
      schemaPlayer.swords = enginePlayer.resources.swords;
      schemaPlayer.boots = enginePlayer.resources.boots;
      schemaPlayer.gold = enginePlayer.gold;
      schemaPlayer.clank = enginePlayer.clank;
      schemaPlayer.damage = enginePlayer.damage;
      schemaPlayer.roomId = enginePlayer.roomId;
      schemaPlayer.points = enginePlayer.points;
      schemaPlayer.artifactsCarried = enginePlayer.artifactsCarried;
      schemaPlayer.monkeyIdolsHeld = enginePlayer.monkeyIdolsHeld.length;
      schemaPlayer.hasMasterKey = enginePlayer.hasMasterKey;
      schemaPlayer.hasBackpack = enginePlayer.hasBackpack;
      schemaPlayer.hasLeftDungeon = enginePlayer.hasLeftDungeon;
      schemaPlayer.finalScore = state.finalScores?.[enginePlayer.id] ?? -1;
    }

    // Repassa pro log da sala só as linhas novas geradas pelo motor desde a última sync
    // (ex: "X foi nocauteado!", "O dragão atacou!", "Y pegou um artefato!").
    while (this.lastEngineLogIndex < state.log.length) {
      this.pushLog(state.log[this.lastEngineLogIndex]);
      this.lastEngineLogIndex++;
    }
  }

  private pushLog(line: string) {
    this.state.log.push(line);
    while (this.state.log.length > MAX_LOG_LINES) {
      this.state.log.shift();
    }
  }
}
