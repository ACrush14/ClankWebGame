import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { BOARD, GameEngine, getCard } from "@clank/engine";

/** Paleta fixa de cores por jogador — sem arte oficial, só blocos de cor + inicial. */
const PLAYER_COLORS = ["#38bdf8", "#f472b6", "#a3e635", "#fb923c", "#a78bfa", "#2dd4bf"];

/**
 * Código de sala amigável (4 dígitos, sem repetir, sem zero à esquerda — ex: "4827") em
 * vez do id interno do Colyseus (ex: "5dBQV-Z9T"), pedido pelo usuário por ser mais fácil
 * de ditar/digitar entre amigos. Mapeado pra o roomId real do Colyseus nesse registro em
 * memória — só existe enquanto o processo do servidor está de pé, populado em `onCreate`
 * e limpo em `onDispose`. `resolveRoomCode` é usado pela rota HTTP em `index.ts` que o
 * client chama antes de `joinById`.
 */
const roomCodeToRoomId = new Map<string, string>();

export function resolveRoomCode(code: string): string | undefined {
  return roomCodeToRoomId.get(code.trim());
}

function generateUniqueRoomCode(): string {
  let code: string;
  do {
    const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    // primeiro dígito não pode ser 0 (senão o código "perderia" um dígito na prática)
    if (digits[0] === "0") {
      const swapIndex = digits.slice(1, 4).findIndex((d) => d !== "0") + 1;
      [digits[0], digits[swapIndex]] = [digits[swapIndex], digits[0]];
    }
    code = digits.slice(0, 4).join("");
  } while (roomCodeToRoomId.has(code));
  return code;
}

export class Player extends Schema {
  @type("string") name = "Jogador";
  @type("string") color = PLAYER_COLORS[0];
  @type("boolean") connected = true;
  /** Só usado na fase de lobby. */
  @type("boolean") ready = false;
  /** Bot local (sem client de verdade por trás) — pra testar sozinho. Ver `runBotTurn`. */
  @type("boolean") isBot = false;

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
  /** Código amigável de 4 dígitos (ver `generateUniqueRoomCode`) — o que o jogador digita/vê, não o id interno do Colyseus. */
  @type("string") roomCode = "";
}

const MAX_PLAYERS = 4;
const MAX_LOG_LINES = 30;

export class ClankRoom extends Room<ClankRoomState> {
  maxClients = MAX_PLAYERS;
  private engine: GameEngine | null = null;
  private lastEngineLogIndex = 0;
  private botCounter = 0;

  onCreate() {
    this.setState(new ClankRoomState());
    this.state.roomCode = generateUniqueRoomCode();
    roomCodeToRoomId.set(this.state.roomCode, this.roomId);

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

    /** Adiciona um bot local pra testar sozinho — pronto automaticamente, joga sozinho via `runBotTurn`. */
    this.onMessage("add_bot", () => {
      if (this.state.phase !== "lobby") return;
      if (this.state.players.size >= MAX_PLAYERS) return;
      const botId = `bot-${++this.botCounter}`;
      const bot = new Player();
      bot.name = `Bot ${this.botCounter}`;
      bot.color = PLAYER_COLORS[this.state.players.size % PLAYER_COLORS.length];
      bot.isBot = true;
      bot.ready = true;
      this.state.players.set(botId, bot);
      this.pushLog(`${bot.name} entrou na sala.`);
    });

    this.onMessage("remove_bot", (_client, botId: string) => {
      if (this.state.phase !== "lobby") return;
      const bot = this.state.players.get(botId);
      if (!bot?.isBot) return;
      this.state.players.delete(botId);
      this.pushLog(`${bot.name} saiu da sala.`);
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
    roomCodeToRoomId.delete(this.state.roomCode);
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
      this.runBotTurnsIfNeeded();
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
      this.runBotTurnsIfNeeded();
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

  /**
   * Roda o(s) turno(s) de bot automaticamente enquanto o jogador da vez for um bot —
   * cobre o caso de 2+ bots seguidos, ou o bot já ser o primeiro a jogar. `guard` é só
   * proteção contra um bug fazer isso girar pra sempre (nunca deveria bater no limite,
   * já que cada `runBotTurn` sempre avança a vez).
   */
  private runBotTurnsIfNeeded() {
    if (!this.engine) return;
    let ranAny = false;
    let guard = 0;
    while (this.engine.state.phase === "playing" && guard++ < 20) {
      const current = this.engine.currentPlayer;
      if (!this.state.players.get(current.id)?.isBot) break;
      this.runBotTurn(current.id);
      ranAny = true;
    }
    if (ranAny) this.syncFromEngine();
  }

  /**
   * IA bem simples só pra dar um oponente pra testar sozinho — não é estratégica de
   * verdade: joga toda a mão, gasta Skill/Swords na opção mais barata disponível
   * (repetindo até não sobrar recurso ou nada acessível), pega artefato/ídolo da sala
   * atual se puder, anda por túneis que consiga pagar, e sai da masmorra se estiver na
   * Entrada carregando algum artefato. Qualquer escolha "X -OU- Y" pendente sempre pega
   * a primeira opção. O `finally` garante que o turno sempre termina (mesmo se algo
   * desse errado no meio), pra nunca travar a sala esperando um bot que nunca age.
   */
  private runBotTurn(botId: string) {
    const engine = this.engine;
    if (!engine) return;

    const resolvePendingChoices = () => {
      let guard = 0;
      while (engine.state.pendingChoice && guard++ < 10) {
        try {
          engine.resolveChoice(botId, 0);
        } catch {
          break;
        }
      }
    };

    try {
      resolvePendingChoices();
      const player = () => engine.state.players.find((p) => p.id === botId);

      for (const cardId of [...(player()?.hand ?? [])]) {
        try {
          engine.playCard(botId, cardId);
        } catch {
          // carta não jogável agora — fica na mão, descartada no fim do turno mesmo assim
        }
        resolvePendingChoices();
      }

      // Skill: compra repetidamente a opção mais barata disponível (Dungeon Row, depois Reserva).
      for (let guard = 0; guard < 20; guard++) {
        const p = player();
        if (!p || p.resources.skill <= 0) break;
        let bought = false;

        let bestSlot = -1;
        let bestCost = Infinity;
        engine.state.dungeonRow.slots.forEach((cardId, idx) => {
          if (!cardId) return;
          const card = getCard(cardId);
          if (card.kind === "monster") return;
          const cost = card.skillCost ?? 0;
          if (cost <= p.resources.skill && cost < bestCost) {
            bestCost = cost;
            bestSlot = idx;
          }
        });
        if (bestSlot !== -1) {
          try {
            engine.acquireCard(botId, bestSlot);
            bought = true;
          } catch {
            // sala/requisito não bate — tenta a Reserva a seguir
          }
        }

        if (!bought) {
          for (const [cardId, count] of Object.entries(engine.state.reserve.remaining)) {
            if (count <= 0) continue;
            const card = getCard(cardId);
            if (card.kind === "monster") continue;
            if ((card.skillCost ?? 0) > p.resources.skill) continue;
            try {
              engine.acquireFromReserve(botId, cardId);
              bought = true;
              break;
            } catch {
              // tenta a próxima carta da Reserva
            }
          }
        }

        resolvePendingChoices();
        if (!bought) break;
      }

      // Swords: luta repetidamente o monstro mais barato disponível (Dungeon Row, depois Reserva).
      for (let guard = 0; guard < 20; guard++) {
        const p = player();
        if (!p || p.resources.swords <= 0) break;
        let fought = false;

        let bestSlot = -1;
        let bestCost = Infinity;
        engine.state.dungeonRow.slots.forEach((cardId, idx) => {
          if (!cardId) return;
          const card = getCard(cardId);
          if (card.kind !== "monster") return;
          const cost = card.swordCost ?? 0;
          if (cost <= p.resources.swords && cost < bestCost) {
            bestCost = cost;
            bestSlot = idx;
          }
        });
        if (bestSlot !== -1) {
          try {
            engine.fightMonster(botId, bestSlot);
            fought = true;
          } catch {
            // sala/requisito não bate — tenta a Reserva a seguir
          }
        }

        if (!fought) {
          for (const [cardId, count] of Object.entries(engine.state.reserve.remaining)) {
            if (count <= 0) continue;
            const card = getCard(cardId);
            if (card.kind !== "monster") continue;
            if ((card.swordCost ?? 0) > p.resources.swords) continue;
            try {
              engine.acquireFromReserve(botId, cardId);
              fought = true;
              break;
            } catch {
              // tenta a próxima carta da Reserva
            }
          }
        }

        resolvePendingChoices();
        if (!fought) break;
      }

      try {
        engine.takeArtifact(botId);
      } catch {
        // sem artefato disponível na sala, ou já no limite — sem-op
      }
      try {
        engine.takeMonkeyIdol(botId);
      } catch {
        // sem ídolo disponível na sala — sem-op
      }

      // Boots: anda por túneis que consiga pagar (pula os trancados sem chave-mestra).
      for (let guard = 0; guard < 10; guard++) {
        const p = player();
        if (!p || p.resources.boots <= 0) break;
        const room = BOARD.rooms[p.roomId];
        if (!room) break;
        const tunnel = room.tunnels.find((t) => {
          if (t.icon?.locked && !p.hasMasterKey) return false;
          const cost = t.icon?.footprint ? 2 : 1;
          return cost <= p.resources.boots;
        });
        if (!tunnel) break;
        try {
          engine.movePlayer(botId, tunnel.to);
        } catch {
          break;
        }
        resolvePendingChoices();
      }

      const finalPlayer = player();
      if (finalPlayer) {
        const room = BOARD.rooms[finalPlayer.roomId];
        if (room?.isEntrance && finalPlayer.artifactsCarried > 0) {
          try {
            engine.leaveDungeon(botId);
          } catch {
            // não devia acontecer (regra: só a Entrada permite sair), mas não trava o bot por isso
          }
        }
      }
    } catch (err) {
      console.error(`Bot ${botId} teve um erro inesperado no turno:`, err);
    } finally {
      try {
        if (engine.state.phase === "playing" && engine.currentPlayer.id === botId) {
          engine.endTurn(botId);
        }
      } catch {
        // último recurso — se nem isso funcionar, o guard de runBotTurnsIfNeeded evita loop infinito
      }
    }
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
