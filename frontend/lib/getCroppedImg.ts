export type PixelCrop = { x: number; y: number; width: number; height: number };

const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_DIM = 1024;
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar"))),
      "image/jpeg",
      quality,
    );
  });
}

export async function getCroppedImg(imageSrc: string, crop: PixelCrop): Promise<File> {
  const image = await loadImage(imageSrc);

  const scale = Math.min(1, MAX_DIM / Math.max(crop.width, crop.height));
  const outW = Math.max(1, Math.round(crop.width * scale));
  const outH = Math.max(1, Math.round(crop.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung di browser ini");

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, outW, outH,
  );

  let blob = await canvasToBlob(canvas, QUALITY_STEPS[0]);
  for (let i = 1; i < QUALITY_STEPS.length && blob.size > MAX_OUTPUT_BYTES; i++) {
    blob = await canvasToBlob(canvas, QUALITY_STEPS[i]);
  }

  if (blob.size > MAX_OUTPUT_BYTES) {
    const shrink = Math.sqrt(MAX_OUTPUT_BYTES / blob.size);
    canvas.width = Math.max(1, Math.round(outW * shrink));
    canvas.height = Math.max(1, Math.round(outH * shrink));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, canvas.width, canvas.height,
    );
    blob = await canvasToBlob(canvas, 0.7);
  }

  return new File([blob], "foto-profil.jpg", { type: "image/jpeg" });
}
