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
  GURU:  "/guru/dashboard",
  SISWA: "/siswa/dashboard",
};

const ROLE_PREFIX: Record<string, string> = {
  ADMIN: "/admin",
  GURU:  "/guru",
  SISWA: "/siswa",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token   = request.cookies.get("token")?.value ?? null;
  const payload = token ? await verifyJWT(token) : null;

  if (pathname === "/login") {
    if (payload) {
      const dest = ROLE_DASHBOARD[payload.role] ?? "/siswa/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/dashboard") {
    if (!payload) return NextResponse.redirect(new URL("/login", request.url));
    const dest = ROLE_DASHBOARD[payload.role] ?? "/siswa/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Derived from the verified session token's own payload, not the
  // impersonation_token cookie's mere presence — that cookie can be stale
  // (e.g. left over from before a JWT_SECRET rotation) without meaning the
  // current session is actually an active impersonation.
  const impersonating = !!payload.impersonatedBy;

  if (pathname === "/change-password") {
    if (impersonating || !payload.mustChangePassword) {
      const dest = ROLE_DASHBOARD[payload.role] ?? "/siswa/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!impersonating && payload.mustChangePassword) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (pathname === "/lengkapi-profil") {
    if (payload.role !== "SISWA" || impersonating || payload.profileCompleted) {
      const dest = ROLE_DASHBOARD[payload.role] ?? "/siswa/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!impersonating && payload.role === "SISWA" && !payload.profileCompleted) {
    return NextResponse.redirect(new URL("/lengkapi-profil", request.url));
  }

  if (pathname === "/lengkapi-foto-profil") {
    if (impersonating || payload.hasFotoProfil) {
      const dest = ROLE_DASHBOARD[payload.role] ?? "/siswa/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!impersonating && !payload.hasFotoProfil) {
    return NextResponse.redirect(new URL("/lengkapi-foto-profil", request.url));
  }

  const expected = ROLE_PREFIX[payload.role];
  if (expected && !pathname.startsWith(expected)) {
    const dest = ROLE_DASHBOARD[payload.role] ?? "/siswa/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/change-password",
    "/lengkapi-profil",
    "/lengkapi-foto-profil",
    "/admin/:path*",
    "/guru/:path*",
    "/siswa/:path*",
  ],
};
