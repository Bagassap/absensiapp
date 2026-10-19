import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join } from 'path';

const ZOOM = 16;
const TILE_SIZE = 256;
const OUT_W = 200;
const OUT_H = 150;
const CACHE_DIR = join(process.cwd(), 'uploads', 'tile-cache');
const USER_AGENT = 'LMS-PPLG-SMKMaarifNU01Limpung/1.0 (absensi-harian static-map thumbnail)';
const FETCH_TIMEOUT_MS = 5000;

const PIN_SVG = Buffer.from(
  `<svg width="20" height="28" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 0C4.48 0 0 4.48 0 10c0 7.5 10 18 10 18s10-10.5 10-18C20 4.48 15.52 0 10 0z" fill="#EF4444" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="10" cy="10" r="3.6" fill="#ffffff"/>
  </svg>`,
);

function parseLatLng(lokasi?: string | null): { lat: number; lon: number } | null {
  if (!lokasi) return null;
  const parts = lokasi.split(',');
  if (parts.length < 2) return null;
  const lat = Number(parts[0].trim());
  const lon = Number(parts[1].trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function tileForLatLng(lat: number, lon: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** ZOOM;
  const x = ((lon + 180) / 360) * n * TILE_SIZE;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE;
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  return { tileX, tileY, pxInTile: x - tileX * TILE_SIZE, pyInTile: y - tileY * TILE_SIZE };
}

async function fetchTileBuffer(tileX: number, tileY: number): Promise<Buffer | null> {
  const cachePath = join(CACHE_DIR, String(ZOOM), String(tileX), `${tileY}.png`);
  try {
    return await fs.readFile(cachePath);
  } catch {
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`https://tile.openstreetmap.org/${ZOOM}/${tileX}/${tileY}.png`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(join(CACHE_DIR, String(ZOOM), String(tileX)), { recursive: true });
    await fs.writeFile(cachePath, buf).catch(() => {});
    return buf;
  } catch {
    return null;
  }
}

export async function getStaticMapImage(lokasi?: string | null): Promise<Buffer | null> {
  const coords = parseLatLng(lokasi);
  if (!coords) return null;
  try {
    const { tileX, tileY, pxInTile, pyInTile } = tileForLatLng(coords.lat, coords.lon);
    const tileBuf = await fetchTileBuffer(tileX, tileY);
    if (!tileBuf) return null;

    const cropLeft = Math.min(Math.max(Math.round(pxInTile - OUT_W / 2), 0), TILE_SIZE - OUT_W);
    const cropTop = Math.min(Math.max(Math.round(pyInTile - OUT_H / 2), 0), TILE_SIZE - OUT_H);
    const markerX = pxInTile - cropLeft;
    const markerY = pyInTile - cropTop;
    const pinLeft = Math.max(0, Math.min(Math.round(markerX - 10), OUT_W - 20));
    const pinTop = Math.max(0, Math.min(Math.round(markerY - 28), OUT_H - 28));

    return await sharp(tileBuf)
      .extract({ left: cropLeft, top: cropTop, width: OUT_W, height: OUT_H })
      .composite([{ input: PIN_SVG, left: pinLeft, top: pinTop }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}
