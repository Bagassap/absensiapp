-- AlterTable
ALTER TABLE "materi" DROP COLUMN "starterCss",
DROP COLUMN "starterHtml",
DROP COLUMN "starterJs",
DROP COLUMN "tipe";

-- AlterTable
ALTER TABLE "tugas" ADD COLUMN     "starterCss" TEXT,
ADD COLUMN     "starterHtml" TEXT,
ADD COLUMN     "starterJs" TEXT,
ADD COLUMN     "tipe" TEXT NOT NULL DEFAULT 'SUBMIT';

-- AlterTable
ALTER TABLE "tugas_submisi" ADD COLUMN     "submittedCss" TEXT,
ADD COLUMN     "submittedHtml" TEXT,
ADD COLUMN     "submittedJs" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL,
ALTER COLUMN "fileName" DROP NOT NULL;

