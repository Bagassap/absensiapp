import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tokenCookieOptions } from "@/lib/authCookie";
import { isValidJwt } from "@/lib/verifyToken";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const impersonationToken = cookieStore.get("impersonation_token")?.value;
  const currentToken = cookieStore.get("token")?.value;

  if (!impersonationToken || !(await isValidJwt(impersonationToken))) {
    if (impersonationToken) {
      // Stale/invalid cookie — not a real session to restore, just clear it.
      cookieStore.set("impersonation_token", "", { ...tokenCookieOptions(request), maxAge: 0 });
    }
    return NextResponse.json(
      { message: "Tidak sedang dalam mode pemantauan" },
      { status: 400 },
    );
  }

  if (currentToken) {
    try {
      await fetch(`${BACKEND_URL}/api/users/stop-impersonate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
    } catch {

    }
  }

  const cookieOpts = tokenCookieOptions(request);

  cookieStore.set("token", impersonationToken, cookieOpts);
  cookieStore.set("impersonation_token", "", { ...cookieOpts, maxAge: 0 });

  return NextResponse.json({ success: true, redirectTo: "/admin/dashboard" }, { status: 200 });
}
