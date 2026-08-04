import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function required(name: string) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Falta ${name} en las variables de Railway.`);
  return value.trim();
}

export async function uploadStoreImage(file: File, folder = "products") {
  const accountId = required("R2_ACCOUNT_ID");
  const bucket = required("R2_BUCKET_NAME");
  const publicUrl = required("R2_PUBLIC_URL").replace(/\/$/, "");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
  });
  const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
  const extension = extensionByType[file.type];
  if (!extension) throw new Error("Formato no permitido. Usá JPG, PNG, WEBP o AVIF.");
  if (file.size > 6 * 1024 * 1024) throw new Error("La imagen supera el máximo de 6 MB.");
  const key = `ecommerce/${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, CacheControl: "public, max-age=31536000, immutable" }));
  return `${publicUrl}/${key}`;
}

