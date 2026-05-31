import { useEffect, useRef, useCallback } from "react";
import { analyticsQueue } from "./analyticsQueue";
import { initAnalyticsFlusher, flushEvents } from "./analyticsFlush";
import type { EventType, MemeEvent } from "./analyticsTypes";

// Generate UUID v4 for the session
const generateUUID = () => {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (parseInt(c, 10) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c, 10) / 4).toString(16)
  );
};

const SESSION_ID = generateUUID();
let globalSequence = 0;

export function useAnalytics() {
  const seenMemes = useRef<Set<string>>(new Set());
  const lastViewMemeId = useRef<string | null>(null);
  const lastViewTime = useRef<number>(0);
  const longViewTimeout = useRef<number | null>(null);

  // Initialize flusher once per hook lifecycle
  useEffect(() => {
    initAnalyticsFlusher(SESSION_ID);
    return () => {
      // Flush on unmount
      flushEvents();
    };
  }, []);

  const trackEvent = useCallback((memeId: string, eventType: EventType) => {
    const now = Date.now();
    let timeOnMemeMs = 0;

    // Calculate time_on_meme_ms since the last view
    if (eventType !== "view" && lastViewMemeId.current === memeId && lastViewTime.current > 0) {
      timeOnMemeMs = now - lastViewTime.current;
    }

    // Handle view specific logic
    if (eventType === "view") {
      lastViewMemeId.current = memeId;
      lastViewTime.current = now;

      // Check for re_fetch
      if (seenMemes.current.has(memeId)) {
        analyticsQueue.enqueue({
          meme_id: memeId,
          event_type: "re_fetch",
          time_on_meme_ms: 0,
          timestamp: now,
          sequence: ++globalSequence
        });
      } else {
        seenMemes.current.add(memeId);
      }

      // Schedule long_view event (10 seconds)
      if (longViewTimeout.current) {
        window.clearTimeout(longViewTimeout.current);
      }
      
      longViewTimeout.current = window.setTimeout(() => {
        // If we haven't skipped/swiped away from this meme in 10s, fire long_view
        if (lastViewMemeId.current === memeId) {
          analyticsQueue.enqueue({
            meme_id: memeId,
            event_type: "long_view",
            time_on_meme_ms: Date.now() - lastViewTime.current,
            timestamp: Date.now(),
            sequence: ++globalSequence
          });
        }
      }, 10000);
    } else {
      // Clear long view timeout if user interacts
      if (longViewTimeout.current) {
        window.clearTimeout(longViewTimeout.current);
        longViewTimeout.current = null;
      }
    }

    // Handle skip logic (less than 2s)
    if (eventType === "skip" && timeOnMemeMs < 2000) {
      // It's a true skip
    }

    const event: MemeEvent = {
      meme_id: memeId,
      event_type: eventType,
      time_on_meme_ms: timeOnMemeMs,
      timestamp: now,
      sequence: ++globalSequence
    };

    analyticsQueue.enqueue(event);
  }, []);

  return { trackEvent };
}
