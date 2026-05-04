import type { Meme } from "../types";

const isDataUrl = (url: string) => url.startsWith("data:");

const extensionByMime: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm"
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "meme";

const extensionFromUrl = (url: string) => {
  const dataMatch = url.match(/^data:([^;,]+)[;,]/i);
  if (dataMatch) {
    return extensionByMime[dataMatch[1].toLowerCase()] || "bin";
  }

  try {
    const pathname = new URL(url, window.location.href).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1]?.toLowerCase();
  } catch {
    const match = url.split(/[?#]/)[0]?.match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1]?.toLowerCase();
  }
};

const downloadNameForMeme = (meme: Meme, mimeType?: string) => {
  const extension = (mimeType && extensionByMime[mimeType.toLowerCase()]) || extensionFromUrl(meme.url) || "bin";
  const baseName = sanitizeFileName(meme.title || meme.id);
  return `${baseName}.${extension}`;
};

export const shareMeme = async (meme: Meme) => {
  const appUrl = window.location.origin;
  const shareData: ShareData = {
    title: "Meme Capsule",
    text: `${meme.share_text} | ${meme.rarity} drop`,
    url: isDataUrl(meme.url) ? appUrl : meme.url
  };

  if (navigator.share) {
    await navigator.share(shareData);
    return "shared";
  }

  const fallbackText = `${shareData.text} ${shareData.url}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(fallbackText);
    return "copied";
  }

  return "unsupported";
};

export const saveMeme = async (meme: Meme) => {
  const link = document.createElement("a");
  link.download = downloadNameForMeme(meme);

  if (isDataUrl(meme.url)) {
    link.href = meme.url;
  } else {
    try {
      const response = await fetch(meme.url);
      const blob = await response.blob();
      link.download = downloadNameForMeme(meme, blob.type);
      link.href = URL.createObjectURL(blob);
    } catch {
      link.download = downloadNameForMeme(meme);
      link.href = meme.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  }

  document.body.append(link);
  link.click();
  link.remove();

  if (link.href.startsWith("blob:")) {
    URL.revokeObjectURL(link.href);
  }
};
