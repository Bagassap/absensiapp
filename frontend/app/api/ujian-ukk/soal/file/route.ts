import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath || !filePath.startsWith("/uploads/")) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  try {
    const fileRes = await fetch(`${BACKEND}${filePath}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!fileRes.ok) return new NextResponse("File not found", { status: 404 });

    const fileBuffer = await fileRes.arrayBuffer();
    if (fileBuffer.byteLength === 0) return new NextResponse("Empty file", { status: 404 });

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
        "Content-Length": String(fileBuffer.byteLength),
      },
    });
  } catch {
    return new NextResponse("Failed to fetch file", { status: 502 });
  }
}
