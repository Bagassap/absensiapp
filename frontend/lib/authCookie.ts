// `secure: NODE_ENV === "production"` looks right but is wrong for this deployment:
// it's served over plain HTTP (IP-only, no TLS — see deploy/nginx-lms.conf), and
// browsers silently refuse to store a `Secure` cookie set over a non-HTTPS
// connection (the exception is `localhost`, which is why this only surfaces once
// deployed to a real IP). Derive `secure` from the actual request protocol
// instead, via the `X-Forwarded-Proto` header Nginx sets — so the cookie works
// today over HTTP and stays correct automatically if TLS is added later.
export function tokenCookieOptions(request: Request) {
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax" as const,
    path: "/",
  };
}
