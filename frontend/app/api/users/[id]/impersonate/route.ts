import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tokenCookieOptions } from "@/lib/authCookie";
import { isValidJwt } from "@/lib/verifyToken";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }

  const existingImpersonationToken = cookieStore.get("impersonation_token")?.value;
  if (existingImpersonationToken) {
    if (await isValidJwt(existingImpersonationToken)) {
      return NextResponse.json(
        { message: "Sudah dalam mode pemantauan, tidak dapat memantau bertingkat" },
        { status: 400 },
      );
    }
    // Stale cookie (e.g. left over from a JWT_SECRET rotation, or an
    // interrupted stop-impersonate) — not an active session, clear it.
    cookieStore.set("impersonation_token", "", { ...tokenCookieOptions(request), maxAge: 0 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/users/${id}/impersonate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return NextResponse.json(
      { message: "Server tidak dapat dijangkau" },
      { status: 502 },
    );
  }

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok || !data) {
    return NextResponse.json(
      { message: data?.message || "Gagal memulai mode pemantauan" },
      { status: backendRes.status || 400 },
    );
  }

  const cookieOpts = tokenCookieOptions(request);

  cookieStore.set("impersonation_token", token, cookieOpts);
  cookieStore.set("token", data.access_token, cookieOpts);

  return NextResponse.json({ success: true, redirectTo: data.redirectTo }, { status: 200 });
}
