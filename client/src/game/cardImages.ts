/**
 * Arte real das cartas — placeholder autorizado pelo usuário (projeto pessoal, sem
 * restrição de IP). Cada arquivo em `src/assets/cards/<id>.png` corresponde ao `id` da
 * carta em `engine/src/cards.ts`. `import.meta.glob` (Vite) carrega tudo de uma vez.
 */
const modules = import.meta.glob<{ default: string }>("../assets/cards/*.png", { eager: true });

const CARD_IMAGES: Record<string, string> = {};
for (const path in modules) {
  const id = path.split("/").pop()!.replace(/\.png$/, "");
  CARD_IMAGES[id] = modules[path].default;
}

/** Retorna a URL da arte da carta, ou undefined se não tiver (ainda não modelada/sem imagem). */
export function cardImageUrl(id: string): string | undefined {
  return CARD_IMAGES[id];
}
