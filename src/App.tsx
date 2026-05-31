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
import { fetchLikeCount, getDailyMeme, getRandomMeme, toggleLikeMeme } from "./lib/memeApi";
import { readJson, writeJson } from "./lib/localState";
import { saveMeme, shareMeme } from "./lib/share";
import { useAnalytics } from "./analytics";
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
  const [likedMemes, setLikedMemes] = useState<string[]>(() =>
    readJson("meme-capsule:liked-memes", [])
  );
  const [reactions, setReactions] = useState<Record<string, number>>(() =>
    readJson(REACTIONS_KEY, {})
  );
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("Ready when you are.");
  const [revealKey, setRevealKey] = useState(0);

  const { trackEvent } = useAnalytics();

  const likedSet = useMemo(() => new Set(likedMemes), [likedMemes]);
  const currentReactionCount = currentMeme ? reactions[currentMeme.id] ?? 0 : 0;

  useEffect(() => {
    getDailyMeme().then(setDailyMeme);
  }, []);

  useEffect(() => {
    writeJson("meme-capsule:liked-memes", likedMemes);
  }, [likedMemes]);

  useEffect(() => {
    writeJson(REACTIONS_KEY, reactions);
  }, [reactions]);

  const revealMeme = (meme: Meme, message: string) => {
    setCurrentMeme(meme);
    setRevealKey((key) => key + 1);
    setNotice(message);
    trackEvent(meme.id, "view");

    // Always fetch the real like count from the backend
    fetchLikeCount(meme.id).then((count) => {
      setCurrentMeme((prev) => prev && prev.id === meme.id ? { ...prev, likes_count: count } : prev);
    });
  };

  const spawnRandom = async () => {
    if (currentMeme) {
      trackEvent(currentMeme.id, "skip");
    }
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

  const handleLikeToggle = async () => {
    if (!currentMeme) {
      return;
    }

    const isLiked = likedSet.has(currentMeme.id);
    const action = isLiked ? "unlike" : "like";
    trackEvent(currentMeme.id, action);

    try {
      // Optimistic update locally
      setLikedMemes((existing) =>
        isLiked ? existing.filter((id) => id !== currentMeme.id) : [...existing, currentMeme.id]
      );
      
      // Update UI count optimistically
      const initialCount = currentMeme.likes_count ?? 0;
      const optimisticCount = action === "like" ? initialCount + 1 : Math.max(0, initialCount - 1);
      setCurrentMeme((prev) => prev ? { ...prev, likes_count: optimisticCount } : null);

      const newCount = await toggleLikeMeme(currentMeme.id, action);
      
      // Sync actual backend count
      setCurrentMeme((prev) => prev ? { ...prev, likes_count: newCount } : null);
      setNotice(action === "like" ? "Meme liked!" : "Like removed.");
    } catch (err: any) {
      console.error(err);
      // Revert optimistic updates
      setLikedMemes((existing) =>
        isLiked ? [...existing, currentMeme.id] : existing.filter((id) => id !== currentMeme.id)
      );
      const initialCount = currentMeme.likes_count ?? 0;
      const revertCount = action === "like" ? Math.max(0, initialCount - 1) : initialCount + 1;
      setCurrentMeme((prev) => prev ? { ...prev, likes_count: revertCount } : null);
      setNotice("Failed to sync like with backend.");
    }
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
      trackEvent(currentMeme.id, "share");
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
    trackEvent(currentMeme.id, "download");
    setNotice("Meme saved.");
  };

  const adminMemeCount = getActiveAdminMemes().length;
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isBackendForced = new URLSearchParams(window.location.search).has("backend");
  
  const starterCount = adminMemeCount || fallbackMemes.length;
  const collectionLabel = !isLocal || isBackendForced
    ? "Cloudflare Production Collection"
    : adminMemeCount
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
            onClick={handleLikeToggle}
            disabled={!currentMeme}
            className={currentMeme && likedSet.has(currentMeme.id) ? "is-active" : ""}
            title={currentMeme && likedSet.has(currentMeme.id) ? "Unlike meme" : "Like meme"}
          >
            <Heart size={19} aria-hidden="true" />
            <span>{currentMeme ? currentMeme.likes_count ?? 0 : 0}</span>
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
