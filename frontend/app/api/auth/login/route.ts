import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tokenCookieOptions } from "@/lib/authCookie";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  let body: { login?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Permintaan tidak valid" },
      { status: 400 },
    );
  }

  // Backend sees every login request as coming from this Next.js server (same
  // host), so it can't rate-limit by real client IP unless we forward it —
  // otherwise every visitor behind this proxy shares one throttle bucket.
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { message: "Tidak dapat terhubung ke server. Coba lagi nanti." },
      { status: 502 },
    );
  }

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok || !data) {
    return NextResponse.json(
      { message: data?.message || "NIS/email atau password salah" },
      { status: backendRes.status || 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("token", data.access_token, tokenCookieOptions(request));

  return NextResponse.json({ user: data.user }, { status: 200 });
}
