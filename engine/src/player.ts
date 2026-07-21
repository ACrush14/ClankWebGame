import { buildStartingDeck } from "./cards.js";
import { BOARD } from "./board.js";
import { drawCards, shuffle, type Rng } from "./deck.js";
import { emptyResources, type PlayerState } from "./types.js";

export const HAND_SIZE = 5;

export function createPlayer(id: string, name: string, rng: Rng = Math.random): PlayerState {
  const drawPile = shuffle(buildStartingDeck(), rng);
  return {
    id,
    name,
    drawPile,
    discardPile: [],
    hand: [],
    playedThisTurn: [],
    resources: emptyResources(),
    clank: 0,
    damage: 0,
    knockedOut: false,
    roomId: BOARD.entranceRoomId,
    points: 0,
    gold: 0,
    hasMasterKey: false,
    hasBackpack: false,
    hasLeftDungeon: false,
  };
}

/** Compra até `HAND_SIZE` cartas pra mão, embaralhando o descarte se precisar. */
export function drawHand(player: PlayerState, rng: Rng = Math.random): PlayerState {
  const missing = HAND_SIZE - player.hand.length;
  if (missing <= 0) return player;
  const { drawn, drawPile, discardPile } = drawCards(player.drawPile, player.discardPile, missing, rng);
  return {
    ...player,
    hand: [...player.hand, ...drawn],
    drawPile,
    discardPile,
  };
}
