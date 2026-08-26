-- Tabel absensi_magang belum pernah dipakai (0 baris, tidak ada
-- controller/service yang menulis ke sini sebelumnya), jadi redesain skema
-- ini aman dilakukan tanpa migrasi data.

-- DropIndex
DROP INDEX "absensi_magang_penempatanId_tipe_tanggal_key";

-- AlterTable
ALTER TABLE "absensi_magang" DROP COLUMN "fotoUrl",
DROP COLUMN "keterangan",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "tandaTanganUrl",
DROP COLUMN "tipe",
DROP COLUMN "waktu",
ADD COLUMN     "catatan" TEXT,
ADD COLUMN     "catatanPulang" TEXT,
ADD COLUMN     "foto" TEXT,
ADD COLUMN     "fotoPulang" TEXT,
ADD COLUMN     "lokasi" TEXT,
ADD COLUMN     "lokasiPulang" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "tempatMagangId" TEXT NOT NULL,
ADD COLUMN     "ttd" TEXT,
ADD COLUMN     "ttdPulang" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "waktuAbsen" TEXT,
ADD COLUMN     "waktuPulang" TEXT,
ALTER COLUMN "tanggal" SET DATA TYPE TEXT;

-- DropEnum
DROP TYPE "TipeAbsensi";

-- CreateIndex
CREATE UNIQUE INDEX "absensi_magang_penempatanId_tanggal_key" ON "absensi_magang"("penempatanId", "tanggal");

-- AddForeignKey
ALTER TABLE "absensi_magang" ADD CONSTRAINT "absensi_magang_tempatMagangId_fkey" FOREIGN KEY ("tempatMagangId") REFERENCES "tempat_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
