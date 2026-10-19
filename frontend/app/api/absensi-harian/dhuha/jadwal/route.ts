import { proxyToBackend } from "@/lib/backendProxy";

export async function POST(request: Request) {
  return proxyToBackend("absensi-harian/dhuha/jadwal", "POST", request);
}
