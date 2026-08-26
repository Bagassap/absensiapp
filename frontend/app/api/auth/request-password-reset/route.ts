import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  let body: { namaPengaju?: string; loginIdDiajukan?: string; keterangan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Permintaan tidak valid" }, { status: 400 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/auth/request-password-reset`, {
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

  if (!backendRes.ok) {
    if (backendRes.status === 429) {
      return NextResponse.json(
        { message: "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { message: data?.message || "Gagal mengirim permintaan." },
      { status: backendRes.status },
    );
  }

  return NextResponse.json(data ?? { message: "Permintaan reset password telah dikirim ke admin" });
}
