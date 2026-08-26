/*
  Warnings:

  - You are about to drop the column `materiId` on the `tugas` table. All the data in the column will be lost.
  - Added the required column `mapel` to the `tugas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "tugas" DROP CONSTRAINT "tugas_materiId_fkey";

-- AlterTable
ALTER TABLE "tugas" DROP COLUMN "materiId",
ADD COLUMN     "kelasId" TEXT,
ADD COLUMN     "mapel" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
