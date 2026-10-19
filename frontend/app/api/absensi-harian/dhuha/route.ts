import { proxyToBackend } from "@/lib/backendProxy";

export async function GET(request: Request) {
  const tanggal = new URL(request.url).searchParams.get("tanggal");
  const qs = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : "";
  return proxyToBackend(`absensi-harian/dhuha${qs}`, "GET");
}
