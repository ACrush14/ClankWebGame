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

    // acha uma posição que não seja monstro (não compra com skill) pra testar acquireCard
    const slotIndex = game.state.dungeonRow.slots.findIndex(
      (id) => id !== null && getCard(id).kind !== "monster",
    );
    const cardId = game.state.dungeonRow.slots[slotIndex]!;
    player.resources.skill = getCard(cardId).skillCost ?? 0;

    game.acquireCard(player.id, slotIndex);

    expect(player.discardPile).toContain(cardId);
    expect(player.resources.skill).toBe(0);
    expect(game.state.dungeonRow.slots[slotIndex]).not.toBeNull();
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
