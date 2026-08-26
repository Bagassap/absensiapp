/*
  Warnings:

  - You are about to drop the column `alamat` on the `siswa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "siswa" DROP COLUMN "alamat",
ADD COLUMN     "desa" TEXT,
ADD COLUMN     "dukuh" TEXT,
ADD COLUMN     "kabupaten" TEXT,
ADD COLUMN     "kecamatan" TEXT,
ADD COLUMN     "rt" TEXT,
ADD COLUMN     "rw" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
