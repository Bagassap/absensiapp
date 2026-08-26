/*
  Warnings:

  - You are about to drop the column `jurusan` on the `materi` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "materi" DROP COLUMN "jurusan",
ADD COLUMN     "kelasId" TEXT;

-- AddForeignKey
ALTER TABLE "materi" ADD CONSTRAINT "materi_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
