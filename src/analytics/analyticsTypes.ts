export type EventType =
  | "view"
  | "like"
  | "unlike"
  | "share"
  | "download"
  | "skip"
  | "long_view"
  | "re_fetch";

export interface MemeEvent {
  meme_id: string;
  event_type: EventType;
  time_on_meme_ms: number;
  timestamp: number;
  sequence: number;
}

export interface EventBatchRequest {
  device_id: string;
  session_id: string;
  app_version: string;
  events: MemeEvent[];
}
