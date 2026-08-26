-- CreateTable
CREATE TABLE "lapor_diri_magang" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "penempatanId" TEXT NOT NULL,
    "tempatMagangId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lapor_diri_magang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lapor_diri_magang_penempatanId_periode_key" ON "lapor_diri_magang"("penempatanId", "periode");

-- AddForeignKey
ALTER TABLE "lapor_diri_magang" ADD CONSTRAINT "lapor_diri_magang_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lapor_diri_magang" ADD CONSTRAINT "lapor_diri_magang_penempatanId_fkey" FOREIGN KEY ("penempatanId") REFERENCES "penempatan_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lapor_diri_magang" ADD CONSTRAINT "lapor_diri_magang_tempatMagangId_fkey" FOREIGN KEY ("tempatMagangId") REFERENCES "tempat_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
