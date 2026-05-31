import { analyticsQueue } from "./analyticsQueue";
import { getOrCreateDeviceId } from "./deviceId";
import type { EventBatchRequest } from "./analyticsTypes";

let isFlushing = false;
let flushInterval: number | null = null;
let currentSessionId = "";

export function initAnalyticsFlusher(sessionId: string) {
  currentSessionId = sessionId;

  // Auto flush every 60 seconds
  if (flushInterval !== null) {
    window.clearInterval(flushInterval);
  }
  flushInterval = window.setInterval(flushEvents, 60000);

  // Flush on tab hide/close
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });
}

export async function flushEvents() {
  if (isFlushing || analyticsQueue.size() === 0) return;

  isFlushing = true;
  const eventsToFlush = analyticsQueue.drain();
  
  if (eventsToFlush.length === 0) {
    isFlushing = false;
    return;
  }

  try {
    const deviceId = await getOrCreateDeviceId();
    
    const payload: EventBatchRequest = {
      device_id: deviceId,
      session_id: currentSessionId,
      app_version: "1.0.0", // Hardcoded for web
      events: eventsToFlush
    };

    // Use sendBeacon if page is unloading, otherwise fetch
    if (document.visibilityState === "hidden" && navigator.sendBeacon) {
      // sendBeacon requires Blob/FormData for JSON
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const success = navigator.sendBeacon("/api/events", blob);
      if (!success) {
        analyticsQueue.requeue(eventsToFlush);
      }
    } else {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to flush events: ${response.status}`);
      }
    }
  } catch (err) {
    console.error("Analytics flush failed, requeuing events", err);
    analyticsQueue.requeue(eventsToFlush);
  } finally {
    isFlushing = false;
  }
}
