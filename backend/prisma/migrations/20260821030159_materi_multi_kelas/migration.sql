-- CreateTable
CREATE TABLE "_KelasToMateri" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KelasToMateri_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_KelasToMateri_B_index" ON "_KelasToMateri"("B");

-- AddForeignKey
ALTER TABLE "_KelasToMateri" ADD CONSTRAINT "_KelasToMateri_A_fkey" FOREIGN KEY ("A") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KelasToMateri" ADD CONSTRAINT "_KelasToMateri_B_fkey" FOREIGN KEY ("B") REFERENCES "materi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing single-kelas assignments as the first row of the new
-- many-to-many join table, before dropping the old column.
INSERT INTO "_KelasToMateri" ("A", "B")
SELECT "kelasId", "id" FROM "materi" WHERE "kelasId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "materi" DROP CONSTRAINT "materi_kelasId_fkey";

-- AlterTable
ALTER TABLE "materi" DROP COLUMN "kelasId";
