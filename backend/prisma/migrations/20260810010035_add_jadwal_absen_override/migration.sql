-- CreateTable
CREATE TABLE "jadwal_absen_overrides" (
    "id" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "hadirStartMinutes" INTEGER,
    "hadirEndMinutes" INTEGER,
    "pulangStartMinutes" INTEGER,
    "pulangEndMinutes" INTEGER,
    "keterangan" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_absen_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_absen_overrides_tanggal_key" ON "jadwal_absen_overrides"("tanggal");

-- CreateIndex
CREATE INDEX "jadwal_absen_overrides_tanggal_idx" ON "jadwal_absen_overrides"("tanggal");

-- AddForeignKey
ALTER TABLE "jadwal_absen_overrides" ADD CONSTRAINT "jadwal_absen_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
