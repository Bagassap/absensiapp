-- CreateEnum
CREATE TYPE "StatusAbsensiKegiatan" AS ENUM ('HADIR', 'IZIN');

-- AlterTable
ALTER TABLE "absensi_kegiatan" ADD COLUMN     "status" "StatusAbsensiKegiatan" NOT NULL DEFAULT 'HADIR';
