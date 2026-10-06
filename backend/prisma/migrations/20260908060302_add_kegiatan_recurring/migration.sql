-- CreateTable
CREATE TABLE "kegiatan_recurring" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hari" TEXT NOT NULL,
    "jamMulai" INTEGER NOT NULL,
    "jamSelesai" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kegiatan_recurring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kegiatan_recurring_hari_idx" ON "kegiatan_recurring"("hari");

-- AlterTable
ALTER TABLE "kegiatan" ADD COLUMN "recurringSourceId" TEXT;

-- AddForeignKey
ALTER TABLE "kegiatan_recurring" ADD CONSTRAINT "kegiatan_recurring_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_recurringSourceId_fkey" FOREIGN KEY ("recurringSourceId") REFERENCES "kegiatan_recurring"("id") ON DELETE SET NULL ON UPDATE CASCADE;
