-- DropForeignKey
ALTER TABLE "absensi_kegiatan" DROP CONSTRAINT "absensi_kegiatan_kegiatanId_fkey";

-- AddForeignKey
ALTER TABLE "absensi_kegiatan" ADD CONSTRAINT "absensi_kegiatan_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
