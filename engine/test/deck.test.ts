import { describe, expect, it } from "vitest";
import { drawCards, shuffle } from "../src/deck.js";

describe("shuffle", () => {
  it("preserva todos os elementos (só reordena)", () => {
    const original = ["a", "b", "c", "d", "e"];
    const shuffled = shuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort()).toEqual([...original].sort());
  });

  it("não muta o array original", () => {
    const original = ["a", "b", "c"];
    shuffle(original);
    expect(original).toEqual(["a", "b", "c"]);
  });
});

describe("drawCards", () => {
  it("compra do topo do drawPile sem mexer no discardPile se houver cartas suficientes", () => {
    const result = drawCards(["a", "b", "c"], ["z"], 2);
    expect(result.drawn).toEqual(["a", "b"]);
    expect(result.drawPile).toEqual(["c"]);
    expect(result.discardPile).toEqual(["z"]);
  });

  it("reembaralha o descarte quando o monte de compra esvazia no meio da compra", () => {
    // drawPile tem 1 carta ("a"); pra completar as 3 pedidas, o discardPile
    // (3 cartas) é embaralhado e vira o novo drawPile, do qual saem mais 2 —
    // sobra 1 carta no novo drawPile e o discardPile fica vazio.
    const result = drawCards(["a"], ["b", "c", "d"], 3);
    expect(result.drawn).toHaveLength(3);
    expect(result.drawn).toContain("a");
    expect(result.drawPile).toHaveLength(1);
    expect(result.discardPile).toHaveLength(0);
  });

  it("para de comprar se os dois montes esvaziarem", () => {
    const result = drawCards([], [], 5);
    expect(result.drawn).toHaveLength(0);
  });
});
