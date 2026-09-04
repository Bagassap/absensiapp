/*
  Warnings:

  - You are about to drop the `absensi_harian` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `jadwal_absen_overrides` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "absensi_harian" DROP CONSTRAINT "absensi_harian_guruId_fkey";

-- DropForeignKey
ALTER TABLE "jadwal_absen_overrides" DROP CONSTRAINT "jadwal_absen_overrides_createdById_fkey";

-- DropTable
DROP TABLE "absensi_harian";

-- DropTable
DROP TABLE "jadwal_absen_overrides";

-- CreateTable
CREATE TABLE "kegiatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "jamMulai" INTEGER NOT NULL,
    "jamSelesai" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_kegiatan" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "waktuAbsen" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "ttd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kegiatan_tanggal_idx" ON "kegiatan"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_kegiatan_guruId_kegiatanId_key" ON "absensi_kegiatan"("guruId", "kegiatanId");

-- AddForeignKey
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_kegiatan" ADD CONSTRAINT "absensi_kegiatan_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_kegiatan" ADD CONSTRAINT "absensi_kegiatan_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
