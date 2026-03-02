import { compare } from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginPayload;

  try {
    body = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "JSON invalido" },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne<{
      _id: ObjectId;
      email: string;
      passwordHash: string;
      status?: string;
    }>({
      email,
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { ok: false, message: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    if (user.status && user.status !== "active") {
      return NextResponse.json(
        { ok: false, message: "Usuario inactivo" },
        { status: 403 }
      );
    }

    const isValid = await compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { ok: false, message: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      message: "Login exitoso",
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: user._id.toString(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      { ok: false, message: "Error interno en login" },
      { status: 500 }
    );
  }
}
