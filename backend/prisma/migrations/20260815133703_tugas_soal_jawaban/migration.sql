-- CreateTable
CREATE TABLE "tugas_soal" (
    "id" TEXT NOT NULL,
    "tugasId" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "pertanyaan" TEXT NOT NULL,
    "pilihanA" TEXT,
    "pilihanB" TEXT,
    "pilihanC" TEXT,
    "pilihanD" TEXT,
    "jawabanBenar" TEXT,

    CONSTRAINT "tugas_soal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tugas_jawaban" (
    "id" TEXT NOT NULL,
    "submisiId" TEXT NOT NULL,
    "soalId" TEXT NOT NULL,
    "jawabanPilihan" TEXT,
    "jawabanEssay" TEXT,

    CONSTRAINT "tugas_jawaban_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tugas_jawaban_submisiId_soalId_key" ON "tugas_jawaban"("submisiId", "soalId");

-- AddForeignKey
ALTER TABLE "tugas_soal" ADD CONSTRAINT "tugas_soal_tugasId_fkey" FOREIGN KEY ("tugasId") REFERENCES "tugas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tugas_jawaban" ADD CONSTRAINT "tugas_jawaban_submisiId_fkey" FOREIGN KEY ("submisiId") REFERENCES "tugas_submisi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tugas_jawaban" ADD CONSTRAINT "tugas_jawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "tugas_soal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

