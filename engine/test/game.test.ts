import { describe, expect, it } from "vitest";
import { getCard } from "../src/cards.js";
import { GameEngine } from "../src/game.js";

function twoPlayerGame() {
  return new GameEngine([
    { id: "p1", name: "Anderson" },
    { id: "p2", name: "Brena" },
  ]);
}

describe("setup", () => {
  it("cada jogador começa com mão de 5 cartas e 5 restantes no draw pile (10 - 5)", () => {
    const game = twoPlayerGame();
    for (const player of game.state.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.drawPile).toHaveLength(5);
      expect(player.discardPile).toHaveLength(0);
    }
  });

  it("preenche a Dungeon Row com 5 cartas", () => {
    const game = twoPlayerGame();
    expect(game.state.dungeonRow.slots).toHaveLength(5);
    expect(game.state.dungeonRow.slots.every((s) => s !== null)).toBe(true);
  });

  it("inicia a Reserva com as contagens reais do jogo base (Goblin 1, Explore 15, Mercenary 15, Secret Tome 12)", () => {
    const game = twoPlayerGame();
    expect(game.state.reserve.remaining).toEqual({
      goblin: 1,
      explore: 15,
      mercenary: 15,
      "secret-tome": 12,
    });
  });

  it("o primeiro jogador da lista começa jogando", () => {
    const game = twoPlayerGame();
    expect(game.currentPlayer.id).toBe("p1");
  });
});

describe("playCard", () => {
  it("jogar Burgle dá 1 skill e move a carta pra playedThisTurn", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["burgle", "burgle", "sidestep", "scramble", "stumble"];

    game.playCard(player.id, "burgle");

    expect(player.resources.skill).toBe(1);
    expect(player.hand).toEqual(["burgle", "sidestep", "scramble", "stumble"]);
    expect(player.playedThisTurn).toEqual(["burgle"]);
  });

  it("jogar Stumble não dá recurso, só 1 Clank", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["stumble"];

    game.playCard(player.id, "stumble");

    expect(player.resources).toEqual({ skill: 0, swords: 0, boots: 0, gold: 0 });
    expect(player.clank).toBe(1);
  });

  it("joga carta acumulando múltiplos recursos (Scramble = skill + boot)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["scramble"];

    game.playCard(player.id, "scramble");

    expect(player.resources.skill).toBe(1);
    expect(player.resources.boots).toBe(1);
  });

  it("lança erro se a carta não está na mão", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    expect(() => game.playCard(player.id, "burgle-que-nao-existe-na-mao")).toThrow();
  });

  it("lança erro se não é a vez do jogador", () => {
    const game = twoPlayerGame();
    const other = game.state.players[1];
    expect(() => game.playCard(other.id, "burgle")).toThrow(/não é a vez/i);
  });
});

describe("acquireCard", () => {
  it("compra a carta da Dungeon Row pagando skill e ela vai pro descarte do jogador", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;

    // garante cartas de sobra no monte de compra pra testar o reabastecimento do slot
    // (o baralho placeholder tem só 5 cartas únicas — do tamanho exato da própria Row)
    game.state.dungeonRow.drawPile.push("teleporter");
    game.state.dungeonRow.slots[0] = "teleporter";
    player.resources.skill = getCard("teleporter").skillCost ?? 0;

    game.acquireCard(player.id, 0);

    expect(player.discardPile).toContain("teleporter");
    expect(player.resources.skill).toBe(0);
    expect(game.state.dungeonRow.slots[0]).not.toBeNull();
  });

  it("lança erro se skill insuficiente", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.skill = 0;
    // garante que a posição 0 não é uma carta de custo 0
    game.state.dungeonRow.slots[0] = "explore";

    expect(() => game.acquireCard(player.id, 0)).toThrow(/skill insuficiente/i);
  });

  it("lança erro ao tentar comprar um monstro com acquireCard", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.dungeonRow.slots[0] = "orc-grunt";
    player.resources.skill = 99;

    expect(() => game.acquireCard(player.id, 0)).toThrow(/monstro/i);
  });
});

describe("fightMonster", () => {
  it("vence o monstro pagando swords, ganha a recompensa, e a carta NÃO vai pro baralho do jogador", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.dungeonRow.drawPile.push("orc-grunt");
    game.state.dungeonRow.slots[0] = "orc-grunt";
    player.resources.swords = 2;

    game.fightMonster(player.id, 0);

    expect(player.resources.swords).toBe(0);
    expect(player.resources.gold).toBe(3);
    expect(player.discardPile).not.toContain("orc-grunt");
    expect(game.state.dungeonRow.discardPile).toContain("orc-grunt");
  });

  it("lança erro se swords insuficientes", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.dungeonRow.slots[0] = "orc-grunt";
    player.resources.swords = 0;

    expect(() => game.fightMonster(player.id, 0)).toThrow(/swords insuficientes/i);
  });
});

describe("acquireFromReserve", () => {
  it("compra Explore da Reserva pagando skill e consome uma cópia da pilha (15 -> 14)", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.skill = 3;

    game.acquireFromReserve(player.id, "explore");

    expect(player.discardPile).toContain("explore");
    expect(player.resources.skill).toBe(0);
    expect(game.state.reserve.remaining.explore).toBe(14);
  });

  it("Goblin nunca esgota a Reserva, mesmo lutado várias vezes", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.swords = 10;

    game.acquireFromReserve(player.id, "goblin");
    game.acquireFromReserve(player.id, "goblin");
    game.acquireFromReserve(player.id, "goblin");

    expect(game.state.reserve.remaining.goblin).toBe(1);
    expect(player.resources.gold).toBe(3);
  });

  it("lança erro quando a pilha da Reserva esgota", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    game.state.reserve.remaining["secret-tome"] = 0;
    player.resources.skill = 99;

    expect(() => game.acquireFromReserve(player.id, "secret-tome")).toThrow(/esgotou/i);
  });

  it("lança erro se skill/swords insuficientes na Reserva", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.resources.skill = 0;
    player.resources.swords = 0;

    expect(() => game.acquireFromReserve(player.id, "mercenary")).toThrow(/skill insuficiente/i);
    expect(() => game.acquireFromReserve(player.id, "goblin")).toThrow(/swords insuficientes/i);
  });
});

describe("endTurn", () => {
  it("descarta mão e cartas jogadas, compra 5 novas, zera recursos e passa a vez", () => {
    const game = twoPlayerGame();
    const player = game.currentPlayer;
    player.hand = ["burgle", "burgle"];
    player.playedThisTurn = ["stumble"];
    player.resources.skill = 3;

    game.endTurn(player.id);

    expect(player.hand).toHaveLength(5);
    expect(player.playedThisTurn).toHaveLength(0);
    expect(player.resources).toEqual({ skill: 0, swords: 0, boots: 0, gold: 0 });
    expect(game.currentPlayer.id).toBe("p2");
  });

  it("lança erro se quem chama endTurn não é o jogador da vez", () => {
    const game = twoPlayerGame();
    const other = game.state.players[1];
    expect(() => game.endTurn(other.id)).toThrow(/não é a vez/i);
  });

  it("dá a volta pro primeiro jogador depois do último", () => {
    const game = twoPlayerGame();
    game.endTurn("p1");
    game.endTurn("p2");
    expect(game.currentPlayer.id).toBe("p1");
  });

  it("pula jogadores nocauteados ao avançar o turno", () => {
    const game = new GameEngine([
      { id: "p1", name: "A" },
      { id: "p2", name: "B" },
      { id: "p3", name: "C" },
    ]);
    game.state.players[1].knockedOut = true;

    game.endTurn("p1");

    expect(game.currentPlayer.id).toBe("p3");
  });
});
