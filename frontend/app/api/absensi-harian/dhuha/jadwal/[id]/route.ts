import { proxyToBackend } from "@/lib/backendProxy";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`absensi-harian/dhuha/jadwal/${id}`, "PATCH", request);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`absensi-harian/dhuha/jadwal/${id}`, "DELETE");
}
