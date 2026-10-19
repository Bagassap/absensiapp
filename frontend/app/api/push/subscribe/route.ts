import { proxyToBackend } from "@/lib/backendProxy";

export async function POST(request: Request) {
  return proxyToBackend("push/subscribe", "POST", request);
}

export async function DELETE(request: Request) {
  return proxyToBackend("push/subscribe", "DELETE", request);
}
