import sharp from 'sharp';
import { promises as fs } from 'fs';

const MAX_DIM = 1280;
const JPEG_QUALITY = 75;
const WEBP_QUALITY = 75;

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
  }
}

const PROFILE_PHOTO_DIM = 500;
const PROFILE_PHOTO_QUALITY = 80;

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
