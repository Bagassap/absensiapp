-- CreateTable
CREATE TABLE "jadwal_piket" (
    "id" TEXT NOT NULL,
    "hari" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "lokasiTugas" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_piket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_piket_hari_guruId_key" ON "jadwal_piket"("hari", "guruId");

-- AddForeignKey
ALTER TABLE "jadwal_piket" ADD CONSTRAINT "jadwal_piket_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;
