export function tokenCookieOptions(request: Request) {
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax" as const,
    path: "/",
  };
}
