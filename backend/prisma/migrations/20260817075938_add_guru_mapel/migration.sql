-- CreateTable
CREATE TABLE "guru_mapel" (
    "id" TEXT NOT NULL,
    "guruId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guru_mapel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guru_mapel_guruId_nama_key" ON "guru_mapel"("guruId", "nama");

-- AddForeignKey
ALTER TABLE "guru_mapel" ADD CONSTRAINT "guru_mapel_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;
