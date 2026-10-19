-- CreateTable
CREATE TABLE "jadwal_dhuha" (
    "id" TEXT NOT NULL,
    "minggu" INTEGER NOT NULL,
    "hari" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "kelas" TEXT NOT NULL,
    "mapel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_dhuha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengaturan_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "jadwal_dhuha_minggu_hari_idx" ON "jadwal_dhuha"("minggu", "hari");

-- CreateIndex
CREATE INDEX "jadwal_dhuha_guruId_idx" ON "jadwal_dhuha"("guruId");

-- AddForeignKey
ALTER TABLE "jadwal_dhuha" ADD CONSTRAINT "jadwal_dhuha_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;
