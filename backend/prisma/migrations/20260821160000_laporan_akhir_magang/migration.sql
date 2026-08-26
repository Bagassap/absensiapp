-- CreateEnum
CREATE TYPE "StatusLaporanAkhirMagang" AS ENUM ('TERKIRIM', 'DITERIMA', 'REVISI');

-- CreateTable
CREATE TABLE "laporan_akhir_magang" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "penempatanId" TEXT NOT NULL,
    "tempatMagangId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "catatan" TEXT,
    "pesanRevisi" TEXT,
    "status" "StatusLaporanAkhirMagang" NOT NULL DEFAULT 'TERKIRIM',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_akhir_magang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "laporan_akhir_magang_penempatanId_key" ON "laporan_akhir_magang"("penempatanId");

-- AddForeignKey
ALTER TABLE "laporan_akhir_magang" ADD CONSTRAINT "laporan_akhir_magang_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_akhir_magang" ADD CONSTRAINT "laporan_akhir_magang_penempatanId_fkey" FOREIGN KEY ("penempatanId") REFERENCES "penempatan_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_akhir_magang" ADD CONSTRAINT "laporan_akhir_magang_tempatMagangId_fkey" FOREIGN KEY ("tempatMagangId") REFERENCES "tempat_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
