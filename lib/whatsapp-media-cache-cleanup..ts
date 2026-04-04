import fs from "fs/promises";
import path from "path";

const MEDIA_CACHE_DIR =
  process.env.WHATSAPP_MEDIA_CACHE_DIR ||
  path.join(process.cwd(), ".cache", "whatsapp-media");

export async function cleanupOldMediaCache(days = 30) {
  const maxAgeMs = days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = await fs.readdir(MEDIA_CACHE_DIR);

    for (const file of files) {
      const fullPath = path.join(MEDIA_CACHE_DIR, file);
      const stat = await fs.stat(fullPath);

      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.unlink(fullPath).catch(() => {});
      }
    }
  } catch {
    // ignora si la carpeta no existe todavía
  }
}