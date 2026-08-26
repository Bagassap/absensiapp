import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// A cookie merely being present doesn't mean it's a live session — it can be
// stale (left over from before a JWT_SECRET rotation, or an interrupted
// stop-impersonate flow) and fail signature/expiry verification. Callers that
// gate behavior on "is this token active" must check validity, not presence.
export async function isValidJwt(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
