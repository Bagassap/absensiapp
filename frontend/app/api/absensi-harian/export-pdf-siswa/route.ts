import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["siswaId", "tanggal", "mode", "tanggalMulai", "tanggalSelesai", "bulan", "tahun"]) {
    const value = searchParams.get(key);
    if (value) qs.set(key, value);
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/absensi-harian/export-pdf-siswa?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }

  if (!backendRes.ok || !backendRes.body) {
    const data = await backendRes.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Gagal membuat PDF" }, { status: backendRes.status || 500 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  const disposition = backendRes.headers.get("content-disposition");
  headers.set("Content-Disposition", disposition ?? "attachment; filename=\"Absensi.pdf\"");

  return new NextResponse(backendRes.body, { status: 200, headers });
}
