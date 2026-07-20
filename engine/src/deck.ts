export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Compra `count` cartas do topo de `drawPile`. Se `drawPile` esvaziar no meio do
 * processo, embaralha `discardPile` pra formar um novo `drawPile` (regra padrão de
 * deck-building) e continua comprando.
 *
 * Retorna as cartas compradas e os novos estados de drawPile/discardPile (imutável).
 */
export function drawCards(
  drawPile: string[],
  discardPile: string[],
  count: number,
  rng: Rng = Math.random,
): { drawn: string[]; drawPile: string[]; discardPile: string[] } {
  let draw = [...drawPile];
  let discard = [...discardPile];
  const drawn: string[] = [];

  for (let i = 0; i < count; i++) {
    if (draw.length === 0) {
      if (discard.length === 0) break; // nada mais pra comprar em nenhum dos dois montes
      draw = shuffle(discard, rng);
      discard = [];
    }
    const card = draw.shift();
    if (card) drawn.push(card);
  }

  return { drawn, drawPile: draw, discardPile: discard };
}
