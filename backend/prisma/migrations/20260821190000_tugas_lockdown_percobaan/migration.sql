-- AlterTable
ALTER TABLE "tugas" ADD COLUMN     "durasiMenit" INTEGER;

-- AlterTable
ALTER TABLE "tugas_submisi" ADD COLUMN     "deadlineWaktu" TIMESTAMP(3),
ADD COLUMN     "dipaksaKeluar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jumlahPercobaan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "terkunci" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waktuMulai" TIMESTAMP(3);
