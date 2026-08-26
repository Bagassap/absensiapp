// GPS is mandatory for Hadir/Pulang — a truthy check alone lets a client
// (buggy, stale-cached, or a direct API call bypassing the UI entirely)
// submit a placeholder string like "GPS tidak tersedia" as if it were a
// real location. Require an actual "lat,lng" pair within valid ranges.
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
