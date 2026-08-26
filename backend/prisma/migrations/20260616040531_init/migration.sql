-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GURU', 'SISWA');

-- CreateEnum
CREATE TYPE "TipeAbsensi" AS ENUM ('MASUK', 'PULANG');

-- CreateEnum
CREATE TYPE "StatusPenempatan" AS ENUM ('AKTIF', 'SELESAI', 'BATAL');

-- CreateEnum
CREATE TYPE "StatusIzin" AS ENUM ('PENDING', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siswa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "angkatan" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guru" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_kelas" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "mataPelajaran" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "hari" TEXT NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "ruangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengumuman" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "targetRole" "Role",
    "authorId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempat_magang" (
    "id" TEXT NOT NULL,
    "namaTempat" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "kontak" TEXT,
    "bidangUsaha" TEXT,
    "kuota" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tempat_magang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penempatan_magang" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tempatMagangId" TEXT NOT NULL,
    "guruPembimbingId" TEXT NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE,
    "status" "StatusPenempatan" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penempatan_magang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_magang" (
    "id" TEXT NOT NULL,
    "penempatanId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" "TipeAbsensi" NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL,
    "fotoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "tandaTanganUrl" TEXT,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absensi_magang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "izin_magang" (
    "id" TEXT NOT NULL,
    "penempatanId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "alasan" TEXT NOT NULL,
    "buktiUrl" TEXT,
    "status" "StatusIzin" NOT NULL DEFAULT 'PENDING',
    "diperiksaOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "izin_magang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_ujian_ukk" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "ruangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_ujian_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_ujian_ukk" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "waktuMasuk" TIMESTAMP(3),
    "waktuKeluar" TIMESTAMP(3),
    "tandaTanganUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absensi_ujian_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soal_ukk" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soal_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "berkas_jawaban_ukk" (
    "id" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "berkas_jawaban_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nilai_ukk" (
    "id" TEXT NOT NULL,
    "jadwalId" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_ukk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_userId_key" ON "siswa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_nis_key" ON "siswa"("nis");

-- CreateIndex
CREATE UNIQUE INDEX "guru_userId_key" ON "guru"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guru_nip_key" ON "guru"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "penempatan_magang_siswaId_tempatMagangId_key" ON "penempatan_magang"("siswaId", "tempatMagangId");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_magang_penempatanId_tipe_tanggal_key" ON "absensi_magang"("penempatanId", "tipe", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "izin_magang_penempatanId_tanggal_key" ON "izin_magang"("penempatanId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_ujian_ukk_jadwalId_siswaId_key" ON "absensi_ujian_ukk"("jadwalId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "soal_ukk_jadwalId_key" ON "soal_ukk"("jadwalId");

-- CreateIndex
CREATE UNIQUE INDEX "berkas_jawaban_ukk_soalId_siswaId_key" ON "berkas_jawaban_ukk"("soalId", "siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "nilai_ukk_jadwalId_siswaId_key" ON "nilai_ukk"("jadwalId", "siswaId");

-- AddForeignKey
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guru" ADD CONSTRAINT "guru_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_kelas" ADD CONSTRAINT "jadwal_kelas_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penempatan_magang" ADD CONSTRAINT "penempatan_magang_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penempatan_magang" ADD CONSTRAINT "penempatan_magang_tempatMagangId_fkey" FOREIGN KEY ("tempatMagangId") REFERENCES "tempat_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penempatan_magang" ADD CONSTRAINT "penempatan_magang_guruPembimbingId_fkey" FOREIGN KEY ("guruPembimbingId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_magang" ADD CONSTRAINT "absensi_magang_penempatanId_fkey" FOREIGN KEY ("penempatanId") REFERENCES "penempatan_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_magang" ADD CONSTRAINT "absensi_magang_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_magang" ADD CONSTRAINT "izin_magang_penempatanId_fkey" FOREIGN KEY ("penempatanId") REFERENCES "penempatan_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_magang" ADD CONSTRAINT "izin_magang_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_magang" ADD CONSTRAINT "izin_magang_diperiksaOleh_fkey" FOREIGN KEY ("diperiksaOleh") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_ujian_ukk" ADD CONSTRAINT "jadwal_ujian_ukk_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_ujian_ukk" ADD CONSTRAINT "absensi_ujian_ukk_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "jadwal_ujian_ukk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_ujian_ukk" ADD CONSTRAINT "absensi_ujian_ukk_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soal_ukk" ADD CONSTRAINT "soal_ukk_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "jadwal_ujian_ukk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soal_ukk" ADD CONSTRAINT "soal_ukk_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas_jawaban_ukk" ADD CONSTRAINT "berkas_jawaban_ukk_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "soal_ukk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas_jawaban_ukk" ADD CONSTRAINT "berkas_jawaban_ukk_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_ukk" ADD CONSTRAINT "nilai_ukk_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "jadwal_ujian_ukk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_ukk" ADD CONSTRAINT "nilai_ukk_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_ukk" ADD CONSTRAINT "nilai_ukk_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
