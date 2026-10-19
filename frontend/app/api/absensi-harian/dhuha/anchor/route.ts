import { proxyToBackend } from "@/lib/backendProxy";

export async function PATCH(request: Request) {
  return proxyToBackend("absensi-harian/dhuha/anchor", "PATCH", request);
}
