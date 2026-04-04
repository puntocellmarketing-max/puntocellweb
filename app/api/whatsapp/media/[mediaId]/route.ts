import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type CachedMedia = {
  fileBuffer: Buffer;
  mimeType: string;
  size: number;
  filename: string;
};

function getMediaBaseDir() {
  return path.join(process.cwd(), "storage", "whatsapp-media");
}

function getFileExtensionFromMime(mimeType: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "application/octet-stream": "bin",
  };

  return map[mimeType] || "bin";
}

function getMimeTypeFromExtension(ext: string) {
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".amr": "audio/amr",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".bin": "application/octet-stream",
  };

  return mimeMap[ext.toLowerCase()] || "application/octet-stream";
}

function isInlineMimeType(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf"
  );
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function getCachedMedia(mediaId: string): Promise<CachedMedia | null> {
  try {
    const baseDir = getMediaBaseDir();
    await ensureDir(baseDir);

    const files = await fs.readdir(baseDir);
    const match = files.find((f) => f.startsWith(`${mediaId}.`));

    if (!match) return null;

    const fullPath = path.join(baseDir, match);
    const stat = await fs.stat(fullPath);
    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(match).toLowerCase();

    return {
      fileBuffer,
      mimeType: getMimeTypeFromExtension(ext),
      size: stat.size,
      filename: match,
    };
  } catch {
    return null;
  }
}

async function fetchMetaMediaInfo(mediaId: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";

  if (!token) {
    throw new Error("Falta WHATSAPP_TOKEN en variables de entorno");
  }

  const resp = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data?.error?.message || "No se pudo obtener info del media");
  }

  return data as {
    url: string;
    mime_type?: string;
    sha256?: string;
    file_size?: number;
    id?: string;
  };
}

async function downloadMetaMedia(url: string): Promise<Buffer> {
  const token = process.env.WHATSAPP_TOKEN;

  if (!token) {
    throw new Error("Falta WHATSAPP_TOKEN en variables de entorno");
  }

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || "No se pudo descargar el media desde Meta");
  }

  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function saveMediaToDisk(mediaId: string, mimeType: string, buffer: Buffer) {
  const baseDir = getMediaBaseDir();
  await ensureDir(baseDir);

  const ext = getFileExtensionFromMime(mimeType || "application/octet-stream");
  const filename = `${mediaId}.${ext}`;
  const fullPath = path.join(baseDir, filename);

  await fs.writeFile(fullPath, buffer);

  return { fullPath, filename };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  try {
    const params = await context.params;
    const mediaId = decodeURIComponent(String(params?.mediaId || "").trim());

    if (!mediaId) {
      return NextResponse.json(
        { ok: false, error: "Falta mediaId" },
        { status: 400 }
      );
    }

    const cached = await getCachedMedia(mediaId);
    if (cached) {
      return new Response(new Uint8Array(cached.fileBuffer), {
        status: 200,
        headers: {
          "Content-Type": cached.mimeType,
          "Content-Length": String(cached.size),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Disposition": `${
            isInlineMimeType(cached.mimeType) ? "inline" : "attachment"
          }; filename="${cached.filename}"`,
          "X-WhatsApp-Media-Cache": "HIT",
        },
      });
    }

    const mediaInfo = await fetchMetaMediaInfo(mediaId);
    const mimeType = mediaInfo.mime_type || "application/octet-stream";
    const buffer = await downloadMetaMedia(mediaInfo.url);
    const saved = await saveMediaToDisk(mediaId, mimeType, buffer);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `${
          isInlineMimeType(mimeType) ? "inline" : "attachment"
        }; filename="${saved.filename}"`,
        "X-WhatsApp-Media-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("Error en /api/whatsapp/media/[mediaId]:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error interno al obtener el media",
      },
      { status: 500 }
    );
  }
}