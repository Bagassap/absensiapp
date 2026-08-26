import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

// /uploads/* on the backend now requires auth (+ ownership for students).
// A plain <img src="http://backend/uploads/..."> can't attach that — browsers
// never send Authorization headers for image loads, only cookies, and only
// same-origin/same-site ones. This route runs server-side, reads the httpOnly
// `token` cookie (already available here regardless of image-tag limitations),
// and forwards it to the backend as a Bearer token, then streams the file
// back. Access control itself still lives entirely in the backend middleware;
// this is just plumbing for auth that <img> can't do on its own.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  if (!path?.length || path.some((seg) => seg === ".." || seg.includes("/"))) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  let fileRes: Response;
  try {
    fileRes = await fetch(`${BACKEND}/uploads/${path.join("/")}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return new NextResponse("Failed to fetch file", { status: 502 });
  }

  if (!fileRes.ok || !fileRes.body) {
    return new NextResponse(null, { status: fileRes.status || 404 });
  }

  const headers = new Headers();
  const contentType = fileRes.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "private, max-age=60");

  return new NextResponse(fileRes.body, { status: 200, headers });
}
