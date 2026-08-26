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

// Upper bound passed to createImageBitmap's own resize step, well above
// DEFAULTS.maxDim. A modern phone camera photo can be 4000-8000px on its
// long side — decoding that at full resolution before our canvas resize
// step briefly holds the ENTIRE raw bitmap in memory (a 12MP photo alone is
// ~48MB as raw RGBA, more for higher-MP sensors). On a device that's low on
// free storage, Android also tends to be low on free RAM (aggressive
// swap/cache eviction on cheap hardware), so this decode is the step most
// likely to fail first — before compression ever gets a chance to shrink
// anything. Asking the browser to resize *during* decode (which browsers
// with a scaled/progressive JPEG decoder can do without ever materializing
// the full-resolution buffer) keeps peak memory bounded from the very first
// moment the file is touched, not after.
const DECODE_RESIZE_CAP = 2048;

// Second attempt's decode cap if the first one throws (OOM on a low-end
// device) — well below DEFAULTS.maxDim (1280) since the final output is
// downscaled to that anyway; there is no quality cost to decoding smaller
// than the target when the target itself is this modest. This buys a
// student on a genuinely memory-starved phone a real second chance instead
// of an immediate "penyimpanan penuh" dead end.
const FALLBACK_DECODE_CAP = 900;

/**
 * Resizes and re-encodes an image file on the client before upload, so a
 * multi-MB camera photo is never held in memory (or sent over the network)
 * at full resolution — full-resolution decode is what throws "out of
 * memory" on low-RAM/low-storage Android devices. Never writes the original
 * or any intermediate to localStorage/IndexedDB/Cache API — everything here
 * stays in-memory (canvas + Blob) and is released as soon as this function
 * returns.
 *
 * Retries once at a much smaller decode size if the first pass throws
 * (typically OOM on a low-end/low-memory device) — describePhotoError()'s
 * "storage full" message is only shown to the student after BOTH attempts
 * fail, not on the first transient failure.
 */
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
      // resizeWidth alone preserves aspect ratio (per spec) — this is the
      // "compress as early as possible" step: the full-resolution image is
      // never fully decoded before shrinking.
      bitmap = await createImageBitmap(file, { resizeWidth: decodeResizeCap, resizeQuality: "medium" });
    } catch {
      // Some engines reject resize options for certain formats/orientations —
      // fall back to a plain decode rather than failing the whole capture.
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

/**
 * Reads a (already-compressed) file into a data URL for preview, with a
 * proper error path — a plain `reader.onload = ...` with no `onerror`
 * silently leaves the caller's "processing" state stuck forever if the read
 * fails (e.g. the device is critically low on memory right as the preview
 * is generated).
 */
export function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca hasil foto"));
    reader.readAsDataURL(file);
  });
}

/**
 * Turns a low-level capture/compress failure into a message a student can
 * actually act on. We can't always tell "disk full" apart from "out of
 * memory" from a caught JS error alone — browsers don't expose a clean
 * signal for either, and on the low-end Android devices most students use,
 * the two go hand in hand (aggressive storage-based swap/cache eviction
 * means a nearly-full disk usually means a nearly-full memory budget too).
 * So the message leads with the one the student can actually do something
 * about — freeing up space — rather than a vague "something went wrong"
 * that leaves them thinking the school's system is broken.
 */
export function describePhotoError(): { title: string; detail: string } {
  return {
    title: "Foto gagal diproses",
    detail:
      "Penyimpanan atau memori HP Anda kemungkinan penuh. Silakan hapus beberapa foto/aplikasi yang tidak terpakai di HP Anda, lalu coba ambil/unggah foto lagi.",
  };
}
