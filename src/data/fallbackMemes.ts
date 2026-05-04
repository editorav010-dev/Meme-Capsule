import type { Meme, Rarity } from "../types";

type SeedMeme = {
  id: string;
  lines: string[];
  category: string;
  tags: string[];
  rarity: Rarity;
  palette: {
    bg: string;
    panel: string;
    ink: string;
    accent: string;
  };
};

const escapeSvg = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const svgMeme = (seed: SeedMeme) => {
  const [headline = "", punchline = "", footnote = ""] = seed.lines;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#000000" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="1080" height="1080" fill="${seed.palette.bg}"/>
      <circle cx="168" cy="174" r="74" fill="${seed.palette.accent}" opacity="0.9"/>
      <circle cx="894" cy="874" r="112" fill="${seed.palette.accent}" opacity="0.22"/>
      <rect x="126" y="180" width="828" height="720" rx="48" fill="${seed.palette.panel}" filter="url(#softShadow)"/>
      <rect x="186" y="238" width="708" height="18" rx="9" fill="${seed.palette.accent}"/>
      <text x="540" y="390" text-anchor="middle" font-size="80" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">
        ${escapeSvg(headline)}
      </text>
      <text x="540" y="524" text-anchor="middle" font-size="108" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">
        ${escapeSvg(punchline)}
      </text>
      <text x="540" y="654" text-anchor="middle" font-size="48" font-family="Arial, Helvetica, sans-serif" font-weight="800" fill="${seed.palette.ink}" opacity="0.82">
        ${escapeSvg(footnote)}
      </text>
      <rect x="372" y="738" width="336" height="84" rx="42" fill="${seed.palette.accent}"/>
      <text x="540" y="795" text-anchor="middle" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">
        CURATED CHAOS
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
    id: "meme-003",
    lines: ["My storage plan", "free tier", "please stay calm"],
    category: "Tech Jokes",
    tags: ["free-tier", "backend"],
    rarity: "Common",
    palette: { bg: "#f2f0ff", panel: "#ffffff", ink: "#1a1633", accent: "#8e7cff" }
  },
  {
    id: "meme-004",
    lines: ["User retention", "daily drop", "same button, new suspense"],
    category: "Product Brain",
    tags: ["daily", "retention"],
    rarity: "Rare",
    palette: { bg: "#eafaf1", panel: "#ffffff", ink: "#132218", accent: "#56d08a" }
  },
  {
    id: "meme-005",
    lines: ["The UI brief", "one button", "somehow still overthinking"],
    category: "Design Mood",
    tags: ["minimal", "design"],
    rarity: "Common",
    palette: { bg: "#fff0f0", panel: "#fffafa", ink: "#2a1111", accent: "#ff7b7b" }
  },
  {
    id: "meme-006",
    lines: ["When the meme loads", "instantly", "the backend gets a nod"],
    category: "Tech Jokes",
    tags: ["speed", "api"],
    rarity: "Common",
    palette: { bg: "#effbf7", panel: "#ffffff", ink: "#10241e", accent: "#35c7a4" }
  },
  {
    id: "meme-007",
    lines: ["I said MVP", "then added rarity", "but only a little"],
    category: "Product Brain",
    tags: ["rarity", "scope"],
    rarity: "Rare",
    palette: { bg: "#f9f3ea", panel: "#fffdf8", ink: "#21170d", accent: "#e1a647" }
  },
  {
    id: "meme-008",
    lines: ["Share sheet opens", "group chat wakes", "mission complete"],
    category: "Quick Laughs",
    tags: ["sharing", "chat"],
    rarity: "Common",
    palette: { bg: "#edf4ff", panel: "#ffffff", ink: "#101a2c", accent: "#73a7ff" }
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
    id: "meme-010",
    lines: ["My app strategy", "be tiny", "arrive fast"],
    category: "Builder Mood",
    tags: ["mvp", "speed"],
    rarity: "Common",
    palette: { bg: "#eafffb", panel: "#ffffff", ink: "#0f2422", accent: "#3bc8ba" }
  },
  {
    id: "meme-011",
    lines: ["Cloud bill fear", "compressed images", "inner peace restored"],
    category: "Tech Jokes",
    tags: ["compression", "cost"],
    rarity: "Rare",
    palette: { bg: "#f6f7f1", panel: "#ffffff", ink: "#15170f", accent: "#c4d650" }
  },
  {
    id: "meme-012",
    lines: ["The favorite button", "local only", "privacy is chilling"],
    category: "Privacy",
    tags: ["favorites", "local"],
    rarity: "Common",
    palette: { bg: "#f1f8ff", panel: "#ffffff", ink: "#111c26", accent: "#8ed1fc" }
  },
  {
    id: "meme-013",
    lines: ["Daily drop arrived", "I am seated", "with snacks"],
    category: "Daily Drop",
    tags: ["daily", "ritual"],
    rarity: "Common",
    palette: { bg: "#fff4dc", panel: "#ffffff", ink: "#20160b", accent: "#ffb23f" }
  },
  {
    id: "meme-014",
    lines: ["One more tap", "for science", "and dopamine"],
    category: "Quick Laughs",
    tags: ["again", "tap"],
    rarity: "Common",
    palette: { bg: "#f4ecff", panel: "#ffffff", ink: "#1f1230", accent: "#b685ff" }
  },
  {
    id: "meme-015",
    lines: ["No comments section", "no drama", "just the meme"],
    category: "Minimalism",
    tags: ["clean", "simple"],
    rarity: "Legendary",
    palette: { bg: "#f7f7f7", panel: "#ffffff", ink: "#151515", accent: "#ff5f5f" }
  },
  {
    id: "meme-016",
    lines: ["Meme rarity says", "legendary", "my ego believes it"],
    category: "Rarity",
    tags: ["legendary", "badge"],
    rarity: "Legendary",
    palette: { bg: "#fff1f8", panel: "#ffffff", ink: "#281020", accent: "#ff74b8" }
  },
  {
    id: "meme-017",
    lines: ["Save button clicked", "camera roll blessed", "today is productive"],
    category: "Quick Laughs",
    tags: ["save", "download"],
    rarity: "Common",
    palette: { bg: "#edfbea", panel: "#ffffff", ink: "#152212", accent: "#7fd36d" }
  },
  {
    id: "meme-018",
    lines: ["Backend logic", "pick one row", "act mysterious"],
    category: "Tech Jokes",
    tags: ["random", "database"],
    rarity: "Rare",
    palette: { bg: "#eef0ff", panel: "#ffffff", ink: "#151729", accent: "#7f8cff" }
  },
  {
    id: "meme-019",
    lines: ["Feature creep knocked", "we did not answer", "mostly"],
    category: "Minimalism",
    tags: ["scope", "focus"],
    rarity: "Rare",
    palette: { bg: "#fff9ef", panel: "#ffffff", ink: "#21180d", accent: "#ff9d42" }
  },
  {
    id: "meme-020",
    lines: ["Zero investment build", "maximum vibes", "reasonable architecture"],
    category: "Builder Mood",
    tags: ["free", "architecture"],
    rarity: "Legendary",
    palette: { bg: "#ecfffb", panel: "#111917", ink: "#f8fffd", accent: "#5dffcf" }
  }
];

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

export const getRandomFallbackMeme = (excludeId?: string) => {
  const pool = fallbackMemes.filter((meme) => meme.id !== excludeId);
  const candidates = pool.length > 0 ? pool : fallbackMemes;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

export const getDailyFallbackMeme = (date = new Date()) => {
  const dayStamp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayIndex = Math.floor(dayStamp / 86_400_000) % fallbackMemes.length;
  return fallbackMemes[dayIndex];
};
