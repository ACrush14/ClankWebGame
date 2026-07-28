/**
 * Arte real dos tokens/artefatos — mesmo placeholder autorizado pelo usuário usado em
 * `cardImages.ts` (projeto pessoal, sem restrição de IP). Arquivos em `src/assets/tokens/`.
 */
import type { ChoiceIcon } from "./useClankRoom";

const modules = import.meta.glob<{ default: string }>("../assets/tokens/*.png", { eager: true });

const TOKEN_IMAGES: Record<string, string> = {};
for (const path in modules) {
  const name = path.split("/").pop()!.replace(/\.png$/, "");
  TOKEN_IMAGES[name] = modules[path].default;
}

const ARTIFACT_IMAGE_BY_VALUE: Record<number, string> = {
  5: TOKEN_IMAGES.RingArtifact,
  7: TOKEN_IMAGES.CrossArtifact,
  10: TOKEN_IMAGES.VaseArtifact,
  15: TOKEN_IMAGES.BananaArtifact,
  20: TOKEN_IMAGES.ShieldArtifact,
  25: TOKEN_IMAGES.ArmorArtifact,
  30: TOKEN_IMAGES.OrbArtifact,
};

export function artifactImageUrl(value: number): string | undefined {
  return ARTIFACT_IMAGE_BY_VALUE[value];
}

const MONKEY_IDOL_IMAGE_BY_NAME: Record<string, string> = {
  "Macaco Surdo": TOKEN_IMAGES.MonkeyNoEars,
  "Macaco Cego": TOKEN_IMAGES.MonkeyNoEyes,
  "Macaco Mudo": TOKEN_IMAGES.MonkeyNoMouth,
};

export function monkeyIdolImageUrl(name: string): string | undefined {
  return MONKEY_IDOL_IMAGE_BY_NAME[name];
}

const CROWN_IMAGE_BY_VALUE: Record<number, string> = {
  8: TOKEN_IMAGES.Crown8,
  9: TOKEN_IMAGES.Crown9,
  10: TOKEN_IMAGES.Crown10,
};

export function crownImageUrl(value: number): string | undefined {
  return CROWN_IMAGE_BY_VALUE[value];
}

export const masterKeyImageUrl = TOKEN_IMAGES.MasterKey;
export const backpackImageUrl = TOKEN_IMAGES.Backpack;

/** Tokens de efeito secreto (Bota/Moeda/Cura/Mana/Cartas) — só existem pra algumas combinações icone+quantidade. */
const CHOICE_TOKEN_BY_KEY: Record<string, string> = {
  "boots-1": TOKEN_IMAGES["1Boot"],
  "gold-1": TOKEN_IMAGES["1Coin"],
  "gold-2": TOKEN_IMAGES["2Coin"],
  "gold-5": TOKEN_IMAGES["5Coin"],
  "heal-1": TOKEN_IMAGES["1Health"],
  "heal-2": TOKEN_IMAGES["2Health"],
  "skill-2": TOKEN_IMAGES["2Mana"],
  "skill-5": TOKEN_IMAGES["5Mana"],
  "swords-2": TOKEN_IMAGES["2Damage"],
  "drawCards-3": TOKEN_IMAGES["3Cards"],
};

export function choiceTokenImageUrl(icon: ChoiceIcon, amount: number): string | undefined {
  return CHOICE_TOKEN_BY_KEY[`${icon}-${amount}`];
}
