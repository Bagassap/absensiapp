-- CreateEnum
CREATE TYPE "StatusSiswa" AS ENUM ('AKTIF', 'LULUS');

-- AlterTable
ALTER TABLE "siswa" ADD COLUMN "status" "StatusSiswa" NOT NULL DEFAULT 'AKTIF';
ALTER TABLE "siswa" ADD COLUMN "lulusPada" TIMESTAMP(3);
