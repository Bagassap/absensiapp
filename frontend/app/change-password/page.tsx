import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { ChangePasswordCard } from "./ChangePasswordCard";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Which identity-verification field the form asks for (or whether it's
// skipped entirely) is read straight from the session JWT (same claims the
// middleware already trusts to guard this route) — never fetched from a
// value the client could tamper with.
async function getVerificationState(): Promise<{ bypassIdentityVerification: boolean; role: string }> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { bypassIdentityVerification: false, role: "GURU" };
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as { bypassIdentityVerification?: boolean; role?: string };
    return { bypassIdentityVerification: !!p.bypassIdentityVerification, role: p.role ?? "GURU" };
  } catch {
    return { bypassIdentityVerification: false, role: "GURU" };
  }
}

export default async function ChangePasswordPage() {
  const { bypassIdentityVerification, role } = await getVerificationState();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F1F5F8] px-4 py-12 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,130,251,0.045) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <ChangePasswordCard bypassIdentityVerification={bypassIdentityVerification} role={role} />
    </main>
  );
}
