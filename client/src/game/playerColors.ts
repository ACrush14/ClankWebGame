/** Paleta fixa de cores por jogador — sem arte oficial, só blocos de cor + inicial. */
export const PLAYER_COLORS = [
  { id: "sky", hex: "#38bdf8" },
  { id: "rose", hex: "#f472b6" },
  { id: "lime", hex: "#a3e635" },
  { id: "amber", hex: "#fb923c" },
  { id: "violet", hex: "#a78bfa" },
  { id: "teal", hex: "#2dd4bf" },
] as const;

export const DEFAULT_PLAYER_COLOR = PLAYER_COLORS[0].hex;

export function colorForIndex(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length].hex;
}
