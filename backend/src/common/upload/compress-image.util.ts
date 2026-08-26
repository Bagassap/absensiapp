import sharp from 'sharp';
import { promises as fs } from 'fs';

const MAX_DIM = 1280;
const JPEG_QUALITY = 75;
const WEBP_QUALITY = 75;

/**
 * Server-side safety net behind the client-side compression in
 * frontend/lib/compressImage.ts — re-encodes an uploaded image in place if
 * it's still oversized. Only matters for uploads that bypass the browser
 * (direct API calls) or very old browsers without canvas/createImageBitmap
 * support, since a normal upload through the web UI already arrives at
 * 1280px/JPEG. Keeps the original format so the extension already recorded
 * in the DB/filename stays accurate.
 */
export async function compressUploadedImageInPlace(filePath: string): Promise<void> {
  try {
    const image = sharp(filePath).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) return;
    if (metadata.width <= MAX_DIM && metadata.height <= MAX_DIM) return;

    const resized = image.resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: 'inside',
      withoutEnlargement: true,
    });

    let buffer: Buffer;
    if (metadata.format === 'png') {
      buffer = await resized.png({ compressionLevel: 9 }).toBuffer();
    } else if (metadata.format === 'webp') {
      buffer = await resized.webp({ quality: WEBP_QUALITY }).toBuffer();
    } else {
      buffer = await resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    }
    await fs.writeFile(filePath, buffer);
  } catch {
    // Keep the original upload if compression fails for any reason (corrupt
    // image, unsupported format) — never block the request over this.
  }
}

const PROFILE_PHOTO_DIM = 500;
const PROFILE_PHOTO_QUALITY = 80;

/**
 * Profile photos always land on disk as a fixed 500x500 JPEG, regardless of
 * what the client uploaded — the frontend crop tool already sends a square
 * image, but `fit: 'cover'` here is a server-side backstop against a
 * non-square upload reaching this endpoint some other way (a stale client,
 * a direct API call). The caller always saves with a .jpg filename, so
 * there's no extension/content mismatch from normalizing the format here
 * (unlike compressUploadedImageInPlace, which must preserve the original
 * format since its callers keep the original extension).
 */
export async function compressProfilePhotoInPlace(filePath: string): Promise<void> {
  const buffer = await sharp(filePath)
    .rotate()
    .resize({
      width: PROFILE_PHOTO_DIM,
      height: PROFILE_PHOTO_DIM,
      fit: 'cover',
      position: 'attention',
    })
    .jpeg({ quality: PROFILE_PHOTO_QUALITY, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(filePath, buffer);
}
