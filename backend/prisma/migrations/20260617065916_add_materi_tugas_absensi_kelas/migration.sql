-- AlterTable
ALTER TABLE "guru" ADD COLUMN     "noWa" TEXT;

-- CreateTable
CREATE TABLE "materi_kelas" (
    "id" TEXT NOT NULL,
    "jadwalKelasId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materi_kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tugas_kelas" (
    "id" TEXT NOT NULL,
    "jadwalKelasId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tugas_kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submisi_tugas" (
    "id" TEXT NOT NULL,
    "tugasId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submisi_tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_kelas" (
    "id" TEXT NOT NULL,
    "jadwalKelasId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "absensi_kelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submisi_tugas_tugasId_siswaId_key" ON "submisi_tugas"("tugasId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_kelas_jadwalKelasId_siswaId_tanggal_key" ON "absensi_kelas"("jadwalKelasId", "siswaId", "tanggal");

-- AddForeignKey
ALTER TABLE "materi_kelas" ADD CONSTRAINT "materi_kelas_jadwalKelasId_fkey" FOREIGN KEY ("jadwalKelasId") REFERENCES "jadwal_kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tugas_kelas" ADD CONSTRAINT "tugas_kelas_jadwalKelasId_fkey" FOREIGN KEY ("jadwalKelasId") REFERENCES "jadwal_kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submisi_tugas" ADD CONSTRAINT "submisi_tugas_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "tugas_kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submisi_tugas" ADD CONSTRAINT "submisi_tugas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_kelas" ADD CONSTRAINT "absensi_kelas_jadwalKelasId_fkey" FOREIGN KEY ("jadwalKelasId") REFERENCES "jadwal_kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_kelas" ADD CONSTRAINT "absensi_kelas_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
