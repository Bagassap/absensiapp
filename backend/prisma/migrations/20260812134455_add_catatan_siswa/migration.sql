-- CreateTable
CREATE TABLE "catatan_siswa" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "poin" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catatan_siswa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "catatan_siswa" ADD CONSTRAINT "catatan_siswa_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_siswa" ADD CONSTRAINT "catatan_siswa_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
