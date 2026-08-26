import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { tokenCookieOptions } from "@/lib/authCookie";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const opts = { ...tokenCookieOptions(request), maxAge: 0 };

  cookieStore.set("token", "", opts);
  // Defensive: a full logout should never leave an impersonation session behind.
  cookieStore.set("impersonation_token", "", opts);

  return NextResponse.json({ ok: true });
}
