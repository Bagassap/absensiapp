import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "Tidak terautentikasi" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kelasId = searchParams.get("kelasId") ?? "";
  const jurusan = searchParams.get("jurusan") ?? "";

  const qs = new URLSearchParams();
  if (kelasId) qs.set("kelasId", kelasId);
  if (jurusan) qs.set("jurusan", jurusan);

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/siswa/export-excel?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Server tidak dapat dijangkau" }, { status: 502 });
  }

  if (!backendRes.ok || !backendRes.body) {
    const data = await backendRes.json().catch(() => null);
    return NextResponse.json(data ?? { message: "Gagal membuat Excel" }, { status: backendRes.status || 500 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const disposition = backendRes.headers.get("content-disposition");
  headers.set("Content-Disposition", disposition ?? "attachment; filename=\"Data_Siswa.xlsx\"");

  return new NextResponse(backendRes.body, { status: 200, headers });
}
