-- CreateTable
CREATE TABLE "materi" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "mapel" TEXT NOT NULL,
    "jurusan" TEXT,
    "tipe" TEXT NOT NULL DEFAULT 'DOKUMEN',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "starterHtml" TEXT,
    "starterCss" TEXT,
    "starterJs" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "materi" ADD CONSTRAINT "materi_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
