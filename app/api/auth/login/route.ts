import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createSessionToken, getAuthCookieName } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

type LoginPayload = {
  usuario_login?: string;
  password?: string;
};

type CobradorLoginRow = RowDataPacket & {
  id_cobrador: number;
  nombre: string;
  usuario_login: string;
  activo: number;
  password_hash: string | null;
  rol: "ADMIN" | "SUPERVISOR" | "COBRADOR" | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginPayload;

    const usuario_login = String(body?.usuario_login || "").trim();
    const password = String(body?.password || "").trim();

    if (!usuario_login || !password) {
      return NextResponse.json(
        { ok: false, error: "Debes ingresar usuario y contraseña." },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<CobradorLoginRow[]>(
      `
      SELECT
        id_cobrador,
        nombre,
        usuario_login,
        activo,
        password_hash,
        rol
      FROM crm_cobradores
      WHERE usuario_login = ?
      LIMIT 1
      `,
      [usuario_login]
    );

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas." },
        { status: 401 }
      );
    }

    const user = rows[0];

    if (!Number(user.activo)) {
      return NextResponse.json(
        { ok: false, error: "Usuario inactivo." },
        { status: 403 }
      );
    }

    if (!user.password_hash) {
      return NextResponse.json(
        { ok: false, error: "El usuario no tiene contraseña configurada." },
        { status: 403 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas." },
        { status: 401 }
      );
    }

    await pool.execute(
      `
      UPDATE crm_cobradores
      SET ultimo_login = NOW()
      WHERE id_cobrador = ?
      `,
      [user.id_cobrador]
    );

    const safeRole =
      user.rol === "ADMIN" || user.rol === "SUPERVISOR" || user.rol === "COBRADOR"
        ? user.rol
        : "COBRADOR";

    const token = createSessionToken({
      id_cobrador: Number(user.id_cobrador),
      nombre: user.nombre,
      usuario_login: user.usuario_login,
      rol: safeRole,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id_cobrador: Number(user.id_cobrador),
        nombre: user.nombre,
        usuario_login: user.usuario_login,
        rol: safeRole,
      },
    });

    response.cookies.set({
      name: getAuthCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (e: any) {
    console.error("Error /api/auth/login:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}