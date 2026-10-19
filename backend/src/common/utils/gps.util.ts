export function isValidGpsLokasi(lokasi?: string): boolean {
  if (!lokasi) return false;
  const parts = lokasi.split(',');
  if (parts.length !== 2) return false;
  const lat = Number(parts[0].trim());
  const lng = Number(parts[1].trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}
