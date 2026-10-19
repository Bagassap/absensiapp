export type CompressOptions = {
  maxDim?: number;
  quality?: number;
  mimeType?: string;
};

const DEFAULTS: Required<CompressOptions> = {
  maxDim: 1280,
  quality: 0.75,
  mimeType: "image/jpeg",
};

const DECODE_RESIZE_CAP = 2048;

const FALLBACK_DECODE_CAP = 900;

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  try {
    return await compressOnce(file, options, DECODE_RESIZE_CAP);
  } catch {
    return await compressOnce(file, options, FALLBACK_DECODE_CAP);
  }
}

async function compressOnce(file: File, options: CompressOptions, decodeResizeCap: number): Promise<File> {
  const { maxDim, quality, mimeType } = { ...DEFAULTS, ...options };

  let width: number;
  let height: number;
  let drawable: CanvasImageSource;
  let cleanup = () => {};

  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { resizeWidth: decodeResizeCap, resizeQuality: "medium" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    width = bitmap.width;
    height = bitmap.height;
    drawable = bitmap;
    cleanup = () => bitmap.close();
  } else {
    const { img, url } = await loadImageElement(file);
    width = img.naturalWidth;
    height = img.naturalHeight;
    drawable = img;
    cleanup = () => URL.revokeObjectURL(url);
  }

  try {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak didukung di perangkat ini");
    ctx.drawImage(drawable, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar"))),
        mimeType,
        quality,
      );
    });

    const name = file.name.replace(/\.[a-zA-Z0-9]+$/, "") + ".jpg";
    return new File([blob], name, { type: mimeType, lastModified: Date.now() });
  } finally {
    cleanup();
  }
}

function loadImageElement(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar"));
    };
    img.src = url;
  });
}

export function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca hasil foto"));
    reader.readAsDataURL(file);
  });
}

export function describePhotoError(): { title: string; detail: string } {
  return {
    title: "Foto gagal diproses",
    detail:
      "Penyimpanan atau memori HP Anda kemungkinan penuh. Silakan hapus beberapa foto/aplikasi yang tidak terpakai di HP Anda, lalu coba ambil/unggah foto lagi.",
  };
}
