import type { MemeEvent } from "./analyticsTypes";

const QUEUE_KEY = "meme_drop_analytics_queue";
const MAX_QUEUE_SIZE = 200;

export class AnalyticsQueue {
  private queue: MemeEvent[] = [];

  constructor() {
    this.loadFromStorage();
  }

  enqueue(event: MemeEvent) {
    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      // Drop oldest if we exceed max size
      this.queue.shift();
    }
    this.saveToStorage();
  }

  drain(): MemeEvent[] {
    const events = [...this.queue];
    this.queue = [];
    this.saveToStorage();
    return events;
  }

  size(): number {
    return this.queue.length;
  }

  requeue(events: MemeEvent[]) {
    // Put back at the beginning of the queue
    this.queue = [...events, ...this.queue].slice(0, MAX_QUEUE_SIZE);
    this.saveToStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Ignore quota errors
    }
  }
}

export const analyticsQueue = new AnalyticsQueue();
