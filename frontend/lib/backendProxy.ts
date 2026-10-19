import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function proxyToBackend(path: string, method: string, request?: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });

  const hasBody = request && method !== "GET" && method !== "DELETE";
  const body = hasBody ? await request.json().catch(() => null) : undefined;
  try {
    const res = await fetch(`${BACKEND}/api/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
      body: hasBody ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return NextResponse.json(await res.json().catch(() => null), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }
}
