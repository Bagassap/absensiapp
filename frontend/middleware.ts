import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

type JWTPayload = { sub: string; role: string; nama: string; mustChangePassword?: boolean; profileCompleted?: boolean; hasFotoProfil?: boolean; impersonatedBy?: string | null; exp?: number };

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

const ROLE_DASHBOARD: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  GURU:  "/guru/absensi-harian",
};

const ROLE_PREFIX: Record<string, string> = {
  ADMIN: "/admin",
  GURU:  "/guru",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token   = request.cookies.get("token")?.value ?? null;
  const payload = token ? await verifyJWT(token) : null;

  if (pathname === "/login") {
    if (payload) {
      const dest = ROLE_DASHBOARD[payload.role] ?? "/guru/absensi-harian";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/dashboard") {
    if (!payload) return NextResponse.redirect(new URL("/login", request.url));
    const dest = ROLE_DASHBOARD[payload.role] ?? "/guru/absensi-harian";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const impersonating = !!payload.impersonatedBy;

  if (pathname === "/lengkapi-foto-profil") {
    if (impersonating || payload.hasFotoProfil) {
      const dest = ROLE_DASHBOARD[payload.role] ?? "/guru/absensi-harian";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!impersonating && !payload.hasFotoProfil) {
    return NextResponse.redirect(new URL("/lengkapi-foto-profil", request.url));
  }

  const expected = ROLE_PREFIX[payload.role];
  if (expected && !pathname.startsWith(expected)) {
    const dest = ROLE_DASHBOARD[payload.role] ?? "/guru/absensi-harian";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/lengkapi-foto-profil",
    "/admin/:path*",
    "/guru/:path*",
  ],
};
