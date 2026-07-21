import { describe, expect, it } from "vitest";
import { buildStartingDeck, buildDungeonDeck, getCard } from "../src/cards.js";

describe("baralho inicial", () => {
  it("tem exatamente 10 cartas: 6 Burgle, 1 Cautious Advance, 1 Skillful Move, 2 Stumble", () => {
    const deck = buildStartingDeck();
    expect(deck).toHaveLength(10);
    expect(deck.filter((id) => id === "burgle")).toHaveLength(6);
    expect(deck.filter((id) => id === "cautious-advance")).toHaveLength(1);
    expect(deck.filter((id) => id === "skillful-move")).toHaveLength(1);
    expect(deck.filter((id) => id === "stumble")).toHaveLength(2);
  });

  it("Burgle dá 1 skill e Stumble não dá recurso nenhum (só Clank)", () => {
    expect(getCard("burgle").playEffects).toEqual({ skill: 1 });
    expect(getCard("stumble").playEffects).toEqual({ clank: 1 });
  });
});

describe("dungeon deck (placeholder)", () => {
  it("constrói um monte não vazio a partir das contagens definidas", () => {
    const deck = buildDungeonDeck();
    expect(deck.length).toBeGreaterThan(0);
  });

  it("getCard lança erro pra id desconhecido", () => {
    expect(() => getCard("carta-que-nao-existe")).toThrow();
  });
});
