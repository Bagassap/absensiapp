import { proxyToBackend } from "@/lib/backendProxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  if (page) qs.set("page", page);
  if (limit) qs.set("limit", limit);
  const suffix = qs.toString() ? `?${qs}` : "";
  return proxyToBackend(`absensi-harian/saya/riwayat${suffix}`, "GET");
}
