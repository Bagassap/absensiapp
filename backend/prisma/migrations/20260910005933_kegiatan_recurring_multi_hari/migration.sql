-- Kegiatan berulang sekarang bisa berlaku untuk lebih dari 1 hari (atau
-- semua hari) sekaligus dalam satu aturan, bukan cuma 1 hari per aturan.
-- Tabel masih kosong di produksi (fitur baru), jadi drop+add aman.
DROP INDEX IF EXISTS "kegiatan_recurring_hari_idx";

ALTER TABLE "kegiatan_recurring" DROP COLUMN "hari";
ALTER TABLE "kegiatan_recurring" ADD COLUMN "hari" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
