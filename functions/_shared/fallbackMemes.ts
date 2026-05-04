import type { Meme } from "../../src/types";

type SeedMeme = {
  id: string;
  lines: string[];
  category: string;
  tags: string[];
  rarity: Meme["rarity"];
  palette: {
    bg: string;
    panel: string;
    ink: string;
    accent: string;
  };
};

const seeds: SeedMeme[] = [
  {
    id: "meme-001",
    lines: ["I opened the app", "for one meme", "three shares later"],
    category: "Quick Laughs",
    tags: ["share", "loop"],
    rarity: "Common",
    palette: { bg: "#fff8e7", panel: "#ffffff", ink: "#16120f", accent: "#ffcc4d" }
  },
  {
    id: "meme-002",
    lines: ["Brain at 2 AM", "new app idea", "no budget, full confidence"],
    category: "Builder Mood",
    tags: ["startup", "late-night"],
    rarity: "Rare",
    palette: { bg: "#e9f7ff", panel: "#f8fdff", ink: "#10202b", accent: "#42b8dd" }
  },
  {
    id: "meme-009",
    lines: ["Admin curation", "no random scraping", "taste has entered chat"],
    category: "Curation",
    tags: ["curated", "quality"],
    rarity: "Legendary",
    palette: { bg: "#fff6e9", panel: "#16120f", ink: "#fff8e7", accent: "#ffcc4d" }
  },
  {
    id: "meme-015",
    lines: ["No comments section", "no drama", "just the meme"],
    category: "Minimalism",
    tags: ["clean", "simple"],
    rarity: "Legendary",
    palette: { bg: "#f7f7f7", panel: "#ffffff", ink: "#151515", accent: "#ff5f5f" }
  }
];

const escapeSvg = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const svgMeme = (seed: SeedMeme) => {
  const [headline = "", punchline = "", footnote = ""] = seed.lines;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${seed.palette.bg}"/><rect x="126" y="180" width="828" height="720" rx="48" fill="${seed.palette.panel}"/><rect x="186" y="238" width="708" height="18" rx="9" fill="${seed.palette.accent}"/><text x="540" y="390" text-anchor="middle" font-size="80" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">${escapeSvg(headline)}</text><text x="540" y="524" text-anchor="middle" font-size="108" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">${escapeSvg(punchline)}</text><text x="540" y="654" text-anchor="middle" font-size="48" font-family="Arial, Helvetica, sans-serif" font-weight="800" fill="${seed.palette.ink}" opacity="0.82">${escapeSvg(footnote)}</text><rect x="372" y="738" width="336" height="84" rx="42" fill="${seed.palette.accent}"/><text x="540" y="795" text-anchor="middle" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">CURATED CHAOS</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const fallbackMemes: Meme[] = seeds.map((seed) => ({
  id: seed.id,
  url: svgMeme(seed),
  category: seed.category,
  tags: seed.tags,
  rarity: seed.rarity,
  uploaded_at: "2026-05-02T00:00:00.000Z",
  share_text: `${seed.lines[0]} - ${seed.lines[1]}`,
  rights_note: "original-starter-pack"
}));

export const randomFallbackMeme = () =>
  fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];

export const dailyFallbackMeme = () => {
  const now = new Date();
  const dayStamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return fallbackMemes[Math.floor(dayStamp / 86_400_000) % fallbackMemes.length];
};
