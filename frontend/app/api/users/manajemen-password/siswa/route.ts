import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const kelasId = searchParams.get("kelasId");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  if (kelasId) qs.set("kelasId", kelasId);
  if (page) qs.set("page", page);
  if (limit) qs.set("limit", limit);

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/manajemen-password/siswa?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
