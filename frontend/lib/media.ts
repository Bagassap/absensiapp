export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function resolveMediaSrc(src: string | null | undefined) {
  if (!src) return null;
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (src.startsWith("/uploads/")) return `/api${src}`;
  return `${API_BASE}${src}`;
}
