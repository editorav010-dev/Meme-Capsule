import type { AdminMeme } from "./adminCollection";

type AdminMemeResponse = {
  meme: AdminMeme;
};

type AdminMemesResponse = {
  memes: AdminMeme[];
};

type AdminUploadResponse = {
  url: string;
  storage_path: string;
  source_link: string;
  media_type: AdminMeme["media_type"];
};

const authHeaders = (adminToken: string) => ({
  Authorization: `Bearer ${adminToken}`,
  "X-Admin-Token": adminToken
});

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload as T;
};

export const listBackendMemes = async (adminToken: string) => {
  const response = await fetch("/api/admin/memes", {
    headers: authHeaders(adminToken),
    cache: "no-store"
  });
  const payload = await parseJsonResponse<AdminMemesResponse>(response);
  return payload.memes;
};

export const saveBackendMeme = async (
  adminToken: string,
  meme: AdminMeme,
  originalId?: string | null
) => {
  const response = await fetch("/api/admin/memes", {
    method: originalId ? "PATCH" : "POST",
    headers: {
      ...authHeaders(adminToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ meme, originalId })
  });
  const payload = await parseJsonResponse<AdminMemeResponse>(response);
  return payload.meme;
};

export const archiveBackendMeme = async (adminToken: string, id: string) => {
  const response = await fetch("/api/admin/memes", {
    method: "DELETE",
    headers: {
      ...authHeaders(adminToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id })
  });
  const payload = await parseJsonResponse<AdminMemeResponse>(response);
  return payload.meme;
};

export const uploadBackendMemeFile = async (adminToken: string, file: File) => {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    headers: authHeaders(adminToken),
    body
  });
  return parseJsonResponse<AdminUploadResponse>(response);
};

export type SyncR2Response = {
  message: string;
  totalR2Files: number;
  alreadyInD1: number;
  newlySynced: number;
  syncedFiles: string[];
};

export const syncR2ToD1 = async (adminToken: string) => {
  const response = await fetch("/api/admin/sync-r2", {
    method: "POST",
    headers: authHeaders(adminToken),
    cache: "no-store"
  });
  return parseJsonResponse<SyncR2Response>(response);
};

