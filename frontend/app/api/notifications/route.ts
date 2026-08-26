import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const page  = searchParams.get("page");
  const limit = searchParams.get("limit");
  if (page)  qs.set("page",  page);
  if (limit) qs.set("limit", limit);
  const qsStr = qs.toString() ? `?${qs.toString()}` : "";

  try {
    const res = await fetch(`${BACKEND}/api/notifications${qsStr}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
