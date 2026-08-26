import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

async function getToken() {
  const s = await cookies();
  return s.get("token")?.value;
}

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  try {
    const res = await fetch(`${BACKEND}/api/tugas/submisi/saya`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await res.json().catch(() => null), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
