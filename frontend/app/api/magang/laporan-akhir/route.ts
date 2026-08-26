import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const tempatMagangId = searchParams.get("tempatMagangId");
  if (tempatMagangId) qs.set("tempatMagangId", tempatMagangId);

  try {
    const res = await fetch(`${BACKEND}/api/magang/laporan-akhir?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await res.json().catch(() => null), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
