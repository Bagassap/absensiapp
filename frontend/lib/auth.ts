import { cookies } from "next/headers";

export type UserPayload = {
  sub: string;
  role: "ADMIN" | "GURU" | "SISWA";
  nama: string;
  loginId?: string | null;
  mustChangePassword?: boolean;
  profileCompleted?: boolean;
  fotoProfil?: string | null;
  hasFotoProfil?: boolean;
  impersonatedBy?: string | null;
};

function decodeJWT(token: string): UserPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(json) as UserPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return decodeJWT(token);
}
