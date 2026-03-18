import { cookies } from "next/headers";
import crypto from "crypto";
import { AUTH_COOKIE_NAME } from "@/lib/auth.constants";

export type AuthUser = {
  id_cobrador: number;
  nombre: string;
  usuario_login: string;
  rol: "ADMIN" | "SUPERVISOR" | "COBRADOR";
};

type SessionPayload = AuthUser & {
  iat: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("Falta AUTH_SECRET en variables de entorno.");
  }
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");
}

export function createSessionToken(user: AuthUser) {
  const payload: SessionPayload = {
    ...user,
    iat: Date.now(),
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);

  return `${encoded}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined | null
): AuthUser | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = sign(encoded);

  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as Partial<SessionPayload>;

    if (
      typeof parsed.id_cobrador !== "number" ||
      typeof parsed.nombre !== "string" ||
      typeof parsed.usuario_login !== "string" ||
      (parsed.rol !== "ADMIN" &&
        parsed.rol !== "SUPERVISOR" &&
        parsed.rol !== "COBRADOR")
    ) {
      return null;
    }

    return {
      id_cobrador: parsed.id_cobrador,
      nombre: parsed.nombre,
      usuario_login: parsed.usuario_login,
      rol: parsed.rol,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}