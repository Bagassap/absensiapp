import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tokenCookieOptions } from "@/lib/authCookie";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/siswa/lengkapi-profil`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
      { message: data?.message || "Gagal menyimpan data profil" },
      { status: backendRes.status || 400 },
    );
  }

  cookieStore.set("token", data.access_token, tokenCookieOptions(request));

  return NextResponse.json({ message: data.message }, { status: 200 });
}
