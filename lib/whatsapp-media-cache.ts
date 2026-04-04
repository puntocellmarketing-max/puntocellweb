import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MEDIA_CACHE_DIR =
  process.env.WHATSAPP_MEDIA_CACHE_DIR ||
  path.join(process.cwd(), ".cache", "whatsapp-media");

type CachedMeta = {
  mediaId: string;
  mimeType: string;
  fileName: string;
  savedAt: string;
  size: number;
};

function sanitizeExtFromMime(mimeType?: string | null) {
  if (!mimeType) return "bin";

  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };

  return map[mimeType.toLowerCase()] || mimeType.split("/")[1] || "bin";
}

function buildBaseName(mediaId: string) {
  const safe = mediaId.replace(/[^a-zA-Z0-9_-]/g, "");
  const hash = crypto.createHash("md5").update(mediaId).digest("hex").slice(0, 8);
  return `${safe}-${hash}`;
}

export async function ensureMediaCacheDir() {
  await fs.mkdir(MEDIA_CACHE_DIR, { recursive: true });
}

export async function getCachedMedia(mediaId: string) {
  await ensureMediaCacheDir();

  const base = buildBaseName(mediaId);
  const metaPath = path.join(MEDIA_CACHE_DIR, `${base}.json`);

  try {
    const metaRaw = await fs.readFile(metaPath, "utf8");
    const meta = JSON.parse(metaRaw) as CachedMeta;
    const filePath = path.join(MEDIA_CACHE_DIR, meta.fileName);
    const fileBuffer = await fs.readFile(filePath);

    return {
      ...meta,
      filePath,
      fileBuffer,
    };
  } catch {
    return null;
  }
}

export async function saveCachedMedia(params: {
  mediaId: string;
  mimeType: string;
  buffer: Buffer;
}) {
  await ensureMediaCacheDir();

  const { mediaId, mimeType, buffer } = params;
  const base = buildBaseName(mediaId);
  const ext = sanitizeExtFromMime(mimeType);
  const fileName = `${base}.${ext}`;
  const filePath = path.join(MEDIA_CACHE_DIR, fileName);
  const metaPath = path.join(MEDIA_CACHE_DIR, `${base}.json`);

  await fs.writeFile(filePath, buffer);

  const meta: CachedMeta = {
    mediaId,
    mimeType,
    fileName,
    savedAt: new Date().toISOString(),
    size: buffer.length,
  };

  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");

  return {
    ...meta,
    filePath,
  };
}