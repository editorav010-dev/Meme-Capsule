import type { PagesFunction } from "../../_shared/pages";
import { json, requireAdmin, type Env } from "../../_shared/d1r2";

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "meme-file";

const mediaTypeFromMime = (mimeType: string) => (mimeType.startsWith("video/") ? "video" : "image");

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file") as { name: string; type: string; stream: () => ReadableStream } | null;

  if (!file || typeof file === "string" || !file.name) {
    return json({ error: "Upload requires a file field." }, { status: 400 });
  }

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return json({ error: "Only image and video files are supported." }, { status: 400 });
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${year}/${month}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  await env.MEMES_BUCKET.put(path, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  const publicUrl = publicBase ? `${publicBase}/${path}` : path;

  return json({
    url: publicUrl,
    storage_path: path,
    source_link: file.name,
    media_type: mediaTypeFromMime(file.type)
  });
};
