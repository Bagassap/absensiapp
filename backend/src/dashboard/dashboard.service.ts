import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { todayJakarta as todayStr, weekDatesJakarta as weekDates } from '../common/utils/jakarta-date.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const today = todayStr();
    const dates = weekDates();

    const [
      totalSiswa,
      totalGuru,
      totalKelas,
      pengumuman,
      absensiHariIni,
      absensiWeekRaw,
      siswaCountPerKelas,
      kelasList,
    ] = await Promise.all([
      this.prisma.siswa.count(),
      this.prisma.guru.count(),
      this.prisma.kelas.count(),
      this.prisma.pengumuman.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, nama: true, role: true } },
          _count: { select: { komentar: true } },
        },
      }),
      this.prisma.absensiHarian.findMany({
        where: { tanggal: today },
        select: { status: true },
      }),
      this.prisma.absensiHarian.findMany({
        where: { tanggal: { in: dates } },
        select: { tanggal: true, status: true },
      }),
      this.prisma.siswa.groupBy({ by: ['kelasId'], _count: { _all: true } }),
      this.prisma.kelas.findMany({ select: { id: true, nama: true } }),
    ]);

    const hadirHariIni = absensiHariIni.filter((a) => a.status === 'HADIR').length;
    const izinHariIni = absensiHariIni.filter((a) => a.status === 'IZIN').length;
    const sakitHariIni = absensiHariIni.filter((a) => a.status === 'SAKIT').length;
    const alpaHariIni = absensiHariIni.filter((a) => a.status === 'ALPA').length;
    const totalAbsensiHariIni = absensiHariIni.length;

    const weeklyAbsensi = dates.map((date, i) => ({
      hari: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'][i],
      date,
      hadir: absensiWeekRaw.filter((a) => a.tanggal === date && a.status === 'HADIR').length,
      total: absensiWeekRaw.filter((a) => a.tanggal === date).length,
    }));

    const absensiPerKelasRaw = await this.prisma.absensiHarian.findMany({
      where: { tanggal: today },
      select: { status: true, kelasId: true },
    });

    const kelasNameMap: Record<string, string> = Object.fromEntries(
      kelasList.map((k) => [k.id, k.nama]),
    );
    const siswaMap: Record<string, number> = Object.fromEntries(
      siswaCountPerKelas.map((s) => [s.kelasId, s._count._all]),
    );

    const kelasGroups: Record<string, { hadir: number; total: number }> = {};
    absensiPerKelasRaw.forEach((a) => {
      if (!kelasGroups[a.kelasId]) kelasGroups[a.kelasId] = { hadir: 0, total: 0 };
      kelasGroups[a.kelasId].total++;
      if (a.status === 'HADIR') kelasGroups[a.kelasId].hadir++;
    });

    const kehadiranPerKelas = Object.entries(kelasGroups)
      .map(([kelasId, { hadir, total }]) => {
        const totalSiswa = siswaMap[kelasId] ?? total;
        return {
          kelas: kelasNameMap[kelasId] ?? '-',
          totalSiswa,
          hadir,
          tidakHadir: total - hadir,
          persentase: totalSiswa > 0 ? Math.round((hadir / totalSiswa) * 100) : 0,
        };
      })
      .sort((a, b) => a.kelas.localeCompare(b.kelas));

    return {
      totalSiswa,
      totalGuru,
      totalKelas,
      kehadiran: {
        hadir: hadirHariIni,
        izin: izinHariIni,
        sakit: sakitHariIni,
        alpa: alpaHariIni,
        total: totalAbsensiHariIni,
        persen: totalAbsensiHariIni > 0 ? Math.round((hadirHariIni / totalAbsensiHariIni) * 100) : 0,
      },
      weeklyAbsensi,
      pengumuman,
      kehadiranPerKelas,
    };
  }

  async getGuruStats(userId: string) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return { error: 'Profil guru tidak ditemukan' };

    const today = todayStr();
    const dates = weekDates();

    const [kelasWali, pengumuman] = await Promise.all([
      this.prisma.kelas.findMany({ where: { waliKelasGuruId: guru.id } }),
      this.prisma.pengumuman.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, nama: true, role: true } },
          _count: { select: { komentar: true } },
        },
      }),
    ]);

    const kelasIds = kelasWali.map((k) => k.id);

    const [siswaAmpu, absensiHariIni, absensiWeekRaw] = await Promise.all([
      kelasIds.length > 0 ? this.prisma.siswa.count({ where: { kelasId: { in: kelasIds } } }) : Promise.resolve(0),
      kelasIds.length > 0
        ? this.prisma.absensiHarian.findMany({
            where: { tanggal: today, kelasId: { in: kelasIds } },
            select: { status: true },
          })
        : Promise.resolve([] as { status: string }[]),
      kelasIds.length > 0
        ? this.prisma.absensiHarian.findMany({
            where: { tanggal: { in: dates }, kelasId: { in: kelasIds } },
            select: { tanggal: true, status: true },
          })
        : Promise.resolve([] as { tanggal: string; status: string }[]),
    ]);

    const hadirHariIni = absensiHariIni.filter((a) => a.status === 'HADIR').length;
    const izinHariIni = absensiHariIni.filter((a) => a.status === 'IZIN').length;
    const sakitHariIni = absensiHariIni.filter((a) => a.status === 'SAKIT').length;
    const alpaHariIni = absensiHariIni.filter((a) => a.status === 'ALPA').length;
    const kehadiran = {
      hadir: hadirHariIni,
      izin: izinHariIni,
      sakit: sakitHariIni,
      alpa: alpaHariIni,
      total: siswaAmpu,
      persen: siswaAmpu > 0 ? Math.round((hadirHariIni / siswaAmpu) * 100) : 0,
    };

    const weeklyAbsensi = dates.map((date, i) => ({
      hari: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'][i],
      date,
      hadir: absensiWeekRaw.filter((a) => a.tanggal === date && a.status === 'HADIR').length,
      total: absensiWeekRaw.filter((a) => a.tanggal === date).length,
    }));

    return {
      kelasWali,
      siswaAmpu,
      kehadiran,
      weeklyAbsensi,
      pengumuman,
    };
  }

  async getSiswaStats(userId: string) {
    const siswaRecord = await this.prisma.siswa.findUnique({
      where: { userId },
      include: {
        kelas: { include: { waliKelasGuru: { include: { user: { select: { nama: true } } } } } },
      },
    });
    if (!siswaRecord) return { error: 'Profil siswa tidak ditemukan' };

    const [absensiList, pengumuman, penempatanMagang] = await Promise.all([
      this.prisma.absensiHarian.findMany({
        where: { siswaId: siswaRecord.id },
        select: { status: true },
      }),
      this.prisma.pengumuman.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, nama: true, role: true } },
          _count: { select: { komentar: true } },
        },
      }),
      this.prisma.penempatanMagang.findFirst({
        where: { siswaId: siswaRecord.id, status: { in: ['AKTIF', 'SELESAI'] } },
        orderBy: { tanggalMulai: 'desc' },
        include: {
          tempatMagang: { select: { namaTempat: true } },
          absensi: { select: { status: true } },
        },
      }),
    ]);

    const hadir = absensiList.filter((a) => a.status === 'HADIR').length;
    const izin = absensiList.filter((a) => a.status === 'IZIN').length;
    const sakit = absensiList.filter((a) => a.status === 'SAKIT').length;
    const alpa = absensiList.filter((a) => a.status === 'ALPA').length;
    const totalAbsensi = absensiList.length;
    const persentase = totalAbsensi > 0 ? Math.round((hadir / totalAbsensi) * 1000) / 10 : 0;

    const magang = !penempatanMagang
      ? { status: 'BELUM_MAGANG' as const }
      : {
          status: penempatanMagang.status,
          tempat: penempatanMagang.tempatMagang.namaTempat,
          hadir: penempatanMagang.absensi.filter((a) => a.status === 'HADIR').length,
        };

    return {
      kelas: siswaRecord.kelas.nama,
      waliKelas: siswaRecord.kelas.waliKelasGuru?.user.nama ?? null,
      absensi: { hadir, izin, sakit, alpa, total: totalAbsensi, persentase },
      magang,
      pengumuman,
    };
  }
}
