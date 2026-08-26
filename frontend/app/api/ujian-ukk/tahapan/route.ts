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
    const res = await fetch(`${BACKEND}/api/ujian-ukk/tahapan`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await res.json().catch(() => null), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const res = await fetch(`${BACKEND}/api/ujian-ukk/tahapan`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json().catch(() => null), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
