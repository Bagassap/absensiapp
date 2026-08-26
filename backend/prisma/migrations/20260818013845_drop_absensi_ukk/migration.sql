-- DropForeignKey
ALTER TABLE "absensi_ukk" DROP CONSTRAINT IF EXISTS "absensi_ukk_tahapanId_fkey";

-- DropForeignKey
ALTER TABLE "absensi_ukk" DROP CONSTRAINT IF EXISTS "absensi_ukk_siswaId_fkey";

-- DropTable
DROP TABLE "absensi_ukk";
