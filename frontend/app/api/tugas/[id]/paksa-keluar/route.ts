import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

// Dipanggil lewat navigator.sendBeacon (saat halaman akan unload) atau fetch
// keepalive — body bisa datang sebagai Blob text/plain (bukan application/json)
// karena sendBeacon tidak bisa set header custom, jadi baca sebagai teks lalu
// parse manual alih-alih mengandalkan Content-Type header.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await params;
  const raw = await request.text();
  let body: unknown = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

  try {
    const res = await fetch(`${BACKEND}/api/tugas/${id}/paksa-keluar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json().catch(() => null), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
