import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

// Clicked directly as a link (from the Excel export), not fetched via JS —
// same cookie-to-Bearer proxy pattern as /api/uploads/[...path] since a
// plain browser navigation can't attach an Authorization header itself.
export async function GET(request: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const siswaId = searchParams.get("siswaId") ?? "";
  const tanggal = searchParams.get("tanggal") ?? "";
  const tipe = searchParams.get("tipe") ?? "hadir";

  const qs = new URLSearchParams({ siswaId, tanggal, tipe });

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/absensi-harian/ttd-image?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Failed to fetch file", { status: 502 });
  }

  if (!backendRes.ok || !backendRes.body) {
    return new NextResponse(null, { status: backendRes.status || 404 });
  }

  const headers = new Headers();
  const contentType = backendRes.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "private, max-age=60");

  return new NextResponse(backendRes.body, { status: 200, headers });
}
