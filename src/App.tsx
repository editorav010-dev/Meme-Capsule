import {
  CalendarDays,
  Download,
  Heart,
  Share2,
  SmilePlus,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fallbackMemes } from "./data/fallbackMemes";
import { getActiveAdminMemes } from "./lib/adminCollection";
import { getDailyMeme, getRandomMeme } from "./lib/memeApi";
import { readJson, writeJson } from "./lib/localState";
import { saveMeme, shareMeme } from "./lib/share";
import type { Meme } from "./types";

const FAVORITES_KEY = "meme-capsule:favorites";
const REACTIONS_KEY = "meme-capsule:reactions";

const rarityTone = {
  Common: "tone-common",
  Rare: "tone-rare",
  Legendary: "tone-legendary"
} as const;

export default function App() {
  const [currentMeme, setCurrentMeme] = useState<Meme | null>(null);
  const [dailyMeme, setDailyMeme] = useState<Meme | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []));
  const [reactions, setReactions] = useState<Record<string, number>>(() =>
    readJson(REACTIONS_KEY, {})
  );
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("Ready when you are.");
  const [revealKey, setRevealKey] = useState(0);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const currentReactionCount = currentMeme ? reactions[currentMeme.id] ?? 0 : 0;

  useEffect(() => {
    getDailyMeme().then(setDailyMeme);
  }, []);

  useEffect(() => {
    writeJson(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeJson(REACTIONS_KEY, reactions);
  }, [reactions]);

  const revealMeme = (meme: Meme, message: string) => {
    setCurrentMeme(meme);
    setRevealKey((key) => key + 1);
    setNotice(message);
  };

  const spawnRandom = async () => {
    setIsLoading(true);
    setNotice("Shaking the capsule...");

    const meme = await getRandomMeme(currentMeme?.id);
    window.setTimeout(() => {
      revealMeme(meme, `${meme.rarity} meme spawned.`);
      setIsLoading(false);
    }, 360);
  };

  const showDaily = async () => {
    setIsLoading(true);
    const meme = dailyMeme ?? (await getDailyMeme());
    setDailyMeme(meme);

    window.setTimeout(() => {
      revealMeme(meme, "Daily Drop unlocked.");
      setIsLoading(false);
    }, 240);
  };

  const toggleFavorite = () => {
    if (!currentMeme) {
      return;
    }

    setFavorites((existing) =>
      existing.includes(currentMeme.id)
        ? existing.filter((id) => id !== currentMeme.id)
        : [...existing, currentMeme.id]
    );
  };

  const reactLol = () => {
    if (!currentMeme) {
      return;
    }

    setReactions((existing) => ({
      ...existing,
      [currentMeme.id]: (existing[currentMeme.id] ?? 0) + 1
    }));
    setNotice("Local LOL registered.");
  };

  const handleShare = async () => {
    if (!currentMeme) {
      return;
    }

    try {
      const result = await shareMeme(currentMeme);
      setNotice(result === "copied" ? "Share text copied." : "Share sheet opened.");
    } catch {
      setNotice("Sharing was cancelled.");
    }
  };

  const handleSave = async () => {
    if (!currentMeme) {
      return;
    }

    await saveMeme(currentMeme);
    setNotice("Meme saved.");
  };

  const favoriteCount = favorites.length;
  const adminMemeCount = getActiveAdminMemes().length;
  const starterCount = adminMemeCount || fallbackMemes.length;
  const collectionLabel = adminMemeCount
    ? `${adminMemeCount} active admin memes`
    : `${fallbackMemes.length} local starter memes`;
  const currentIsVideo = currentMeme?.media_type === "video";

  return (
    <main className="app-shell">
      <section className="top-strip" aria-label="App status">
        <div>
          <p className="eyebrow">Meme Capsule</p>
          <h1>One tap. One curated laugh.</h1>
        </div>
        <button
          className="daily-button"
          type="button"
          onClick={showDaily}
          disabled={isLoading}
          title="Reveal today's fixed curated pick"
        >
          <CalendarDays size={18} aria-hidden="true" />
          <span>Daily Drop</span>
        </button>
      </section>

      <section className="capsule-stage" aria-live="polite">
        <div className="meme-area">
          {currentMeme ? (
            <article className="meme-reveal" key={revealKey}>
              <div className="meme-toolbar">
                <span className={`rarity-badge ${rarityTone[currentMeme.rarity]}`}>
                  {currentMeme.rarity}
                </span>
                <span className="category-label">{currentMeme.category}</span>
              </div>
              {currentIsVideo ? (
                <video className="meme-image" src={currentMeme.url} controls playsInline />
              ) : (
                <img className="meme-image" src={currentMeme.url} alt={currentMeme.share_text} />
              )}
            </article>
          ) : (
            <div className="empty-state">
              <Sparkles size={40} aria-hidden="true" />
              <p>Tap the button and let one approved meme escape.</p>
            </div>
          )}
        </div>

        <div className="primary-actions">
          <button className="spawn-button" type="button" onClick={spawnRandom} disabled={isLoading}>
            <Sparkles size={22} aria-hidden="true" />
            <span>{currentMeme ? "Spawn Another" : "Spawn a Random Meme"}</span>
          </button>
        </div>

        <div className="secondary-actions" aria-label="Meme actions">
          <button type="button" onClick={handleShare} disabled={!currentMeme} title="Share meme">
            <Share2 size={19} aria-hidden="true" />
            <span>Share</span>
          </button>
          <button type="button" onClick={handleSave} disabled={!currentMeme} title="Save meme">
            <Download size={19} aria-hidden="true" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={!currentMeme}
            className={currentMeme && favoriteSet.has(currentMeme.id) ? "is-active" : ""}
            title="Favorite meme"
          >
            <Heart size={19} aria-hidden="true" />
            <span>{favoriteCount}</span>
          </button>
          <button type="button" onClick={reactLol} disabled={!currentMeme} title="React with LOL">
            <SmilePlus size={19} aria-hidden="true" />
            <span>{currentReactionCount || "LOL"}</span>
          </button>
        </div>
      </section>

      <section className="status-row" aria-label="App notes">
        <span>{notice}</span>
        <span>{starterCount} {collectionLabel.replace(/^\d+\s/, "")}</span>
      </section>
    </main>
  );
}
