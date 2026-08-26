export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function resolveMediaSrc(src: string | null | undefined) {
  if (!src) return null;
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  // /uploads/* requires auth now — go through our own proxy (app/api/uploads/[...path])
  // which attaches the session cookie server-side, instead of hitting the backend
  // directly where a plain <img> tag has no way to authenticate.
  if (src.startsWith("/uploads/")) return `/api${src}`;
  return `${API_BASE}${src}`;
}
