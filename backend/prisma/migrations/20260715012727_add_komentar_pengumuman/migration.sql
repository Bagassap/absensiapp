-- CreateEnum
CREATE TYPE "TipeUKK" AS ENUM ('INTERNAL', 'EKSTERNAL', 'REVISI');

-- CreateEnum
CREATE TYPE "StatusSubmisiUKK" AS ENUM ('TERKIRIM', 'DITERIMA', 'REVISI');

-- DropForeignKey
ALTER TABLE "absensi_kelas" DROP CONSTRAINT "absensi_kelas_jadwalKelasId_fkey";

-- DropForeignKey
ALTER TABLE "absensi_kelas" DROP CONSTRAINT "absensi_kelas_siswaId_fkey";

-- DropForeignKey
ALTER TABLE "jadwal_kelas" DROP CONSTRAINT "jadwal_kelas_guruId_fkey";

-- DropForeignKey
ALTER TABLE "materi_kelas" DROP CONSTRAINT "materi_kelas_jadwalKelasId_fkey";

-- DropForeignKey
ALTER TABLE "siswa" DROP CONSTRAINT "siswa_userId_fkey";

-- DropForeignKey
ALTER TABLE "submisi_tugas" DROP CONSTRAINT "submisi_tugas_siswaId_fkey";

-- DropForeignKey
ALTER TABLE "submisi_tugas" DROP CONSTRAINT "submisi_tugas_tugasId_fkey";

-- DropForeignKey
ALTER TABLE "tugas_kelas" DROP CONSTRAINT "tugas_kelas_jadwalKelasId_fkey";

-- AlterTable
ALTER TABLE "pengumuman" DROP COLUMN "isi",
DROP COLUMN "targetRole",
ADD COLUMN     "kategori" TEXT NOT NULL DEFAULT 'Umum',
ADD COLUMN     "konten" TEXT NOT NULL,
ADD COLUMN     "prioritas" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "siswa" DROP COLUMN "kelas",
ADD COLUMN     "alamat" TEXT,
ADD COLUMN     "jenisKelamin" TEXT,
ADD COLUMN     "jurusan" TEXT,
ADD COLUMN     "kelasId" TEXT NOT NULL,
ADD COLUMN     "nama" TEXT,
ADD COLUMN     "namaOrtu" TEXT,
ADD COLUMN     "noHp" TEXT,
ADD COLUMN     "tanggalLahir" TIMESTAMP(3),
ADD COLUMN     "tempatLahir" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "loginId" TEXT;

-- DropTable
DROP TABLE "absensi_kelas";

-- DropTable
DROP TABLE "jadwal_kelas";

-- DropTable
DROP TABLE "materi_kelas";

-- DropTable
DROP TABLE "submisi_tugas";

-- DropTable
DROP TABLE "tugas_kelas";

-- CreateTable
CREATE TABLE "kelas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "waliKelasGuruId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_harian" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HADIR',
    "waktuAbsen" TEXT,
    "lokasi" TEXT,
    "foto" TEXT,
    "ttd" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "komentar_pengumuman" (
    "id" TEXT NOT NULL,
    "pengumumanId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "komentar_pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tahapan_ukk" (
    "id" TEXT NOT NULL,
    "tipe" "TipeUKK" NOT NULL,
    "hariKe" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "penguji" TEXT,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tahapan_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peserta_ukk" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tahapanId" TEXT NOT NULL,

    CONSTRAINT "peserta_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_ukk" (
    "id" TEXT NOT NULL,
    "tahapanId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HADIR',
    "waktuAbsen" TEXT,
    "lokasi" TEXT,
    "foto" TEXT,
    "ttd" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absensi_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soal_tahapan_ukk" (
    "id" TEXT NOT NULL,
    "tahapanId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soal_tahapan_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submisi_project_ukk" (
    "id" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "catatan" TEXT,
    "pesanRevisi" TEXT,
    "status" "StatusSubmisiUKK" NOT NULL DEFAULT 'TERKIRIM',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submisi_project_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diskusi_ukk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diskusi_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kelas_nama_key" ON "kelas"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_harian_siswaId_tanggal_key" ON "absensi_harian"("siswaId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "peserta_ukk_siswaId_tahapanId_key" ON "peserta_ukk"("siswaId", "tahapanId");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_ukk_tahapanId_siswaId_tanggal_key" ON "absensi_ukk"("tahapanId", "siswaId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "submisi_project_ukk_soalId_siswaId_key" ON "submisi_project_ukk"("soalId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "pengumuman_slug_key" ON "pengumuman"("slug");

-- CreateIndex
CREATE INDEX "users_loginId_idx" ON "users"("loginId");

-- AddForeignKey
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_waliKelasGuruId_fkey" FOREIGN KEY ("waliKelasGuruId") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_harian" ADD CONSTRAINT "absensi_harian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_harian" ADD CONSTRAINT "absensi_harian_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komentar_pengumuman" ADD CONSTRAINT "komentar_pengumuman_pengumumanId_fkey" FOREIGN KEY ("pengumumanId") REFERENCES "pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komentar_pengumuman" ADD CONSTRAINT "komentar_pengumuman_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "komentar_pengumuman" ADD CONSTRAINT "komentar_pengumuman_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "komentar_pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peserta_ukk" ADD CONSTRAINT "peserta_ukk_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peserta_ukk" ADD CONSTRAINT "peserta_ukk_tahapanId_fkey" FOREIGN KEY ("tahapanId") REFERENCES "tahapan_ukk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_ukk" ADD CONSTRAINT "absensi_ukk_tahapanId_fkey" FOREIGN KEY ("tahapanId") REFERENCES "tahapan_ukk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_ukk" ADD CONSTRAINT "absensi_ukk_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soal_tahapan_ukk" ADD CONSTRAINT "soal_tahapan_ukk_tahapanId_fkey" FOREIGN KEY ("tahapanId") REFERENCES "tahapan_ukk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submisi_project_ukk" ADD CONSTRAINT "submisi_project_ukk_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "soal_tahapan_ukk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submisi_project_ukk" ADD CONSTRAINT "submisi_project_ukk_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diskusi_ukk" ADD CONSTRAINT "diskusi_ukk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diskusi_ukk" ADD CONSTRAINT "diskusi_ukk_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "diskusi_ukk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

