import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { todayJakarta as todayStr, weekDatesJakarta as weekDates } from '../common/utils/jakarta-date.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const today = todayStr();
    const dates = weekDates();

    const [totalGuru, absensiHariIni, absensiWeekRaw, guruList] = await Promise.all([
      this.prisma.guru.count(),
      this.prisma.absensiHarian.findMany({
        where: { tanggal: today },
        select: { guruId: true, status: true, waktuAbsen: true, waktuPulang: true },
      }),
      this.prisma.absensiHarian.findMany({
        where: { tanggal: { in: dates } },
        select: { tanggal: true, status: true },
      }),
      this.prisma.guru.findMany({
        select: { id: true, nip: true, user: { select: { id: true, nama: true, fotoProfil: true } } },
        orderBy: { user: { nama: 'asc' } },
      }),
    ]);

    const hadirHariIni = absensiHariIni.filter((a) => a.status === 'HADIR').length;
    const izinHariIni = absensiHariIni.filter((a) => a.status === 'IZIN').length;
    const sakitHariIni = absensiHariIni.filter((a) => a.status === 'SAKIT').length;
    const belumAbsenHariIni = totalGuru - absensiHariIni.length;

    const weeklyAbsensi = dates.map((date, i) => ({
      hari: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'][i],
      date,
      hadir: absensiWeekRaw.filter((a) => a.tanggal === date && a.status === 'HADIR').length,
      total: totalGuru,
    }));

    const absensiMap = new Map(absensiHariIni.map((a) => [a.guruId, a]));
    const statusGuru = guruList.map((g) => {
      const rec = absensiMap.get(g.id);
      return {
        guruId: g.id,
        nama: g.user?.nama ?? '-',
        nip: g.nip,
        fotoProfil: g.user?.fotoProfil ?? null,
        status: rec?.status ?? null,
        waktuAbsen: rec?.waktuAbsen ?? null,
        waktuPulang: rec?.waktuPulang ?? null,
      };
    });

    return {
      totalGuru,
      kehadiran: {
        hadir: hadirHariIni,
        izin: izinHariIni,
        sakit: sakitHariIni,
        belumAbsen: belumAbsenHariIni,
        total: totalGuru,
        persen: totalGuru > 0 ? Math.round((hadirHariIni / totalGuru) * 100) : 0,
      },
      weeklyAbsensi,
      statusGuru,
    };
  }

  async getGuruStats(userId: string) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return { error: 'Profil guru tidak ditemukan' };

    const dates = weekDates();

    const [absensiAll, absensiWeekRaw] = await Promise.all([
      this.prisma.absensiHarian.findMany({
        where: { guruId: guru.id },
        select: { status: true },
      }),
      this.prisma.absensiHarian.findMany({
        where: { guruId: guru.id, tanggal: { in: dates } },
        select: { tanggal: true, status: true },
      }),
    ]);

    const hadir = absensiAll.filter((a) => a.status === 'HADIR').length;
    const izin = absensiAll.filter((a) => a.status === 'IZIN').length;
    const sakit = absensiAll.filter((a) => a.status === 'SAKIT').length;
    const totalAbsensi = absensiAll.length;
    const kehadiran = {
      hadir,
      izin,
      sakit,
      total: totalAbsensi,
      persen: totalAbsensi > 0 ? Math.round((hadir / totalAbsensi) * 100) : 0,
    };

    const weeklyAbsensi = dates.map((date, i) => ({
      hari: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'][i],
      date,
      status: absensiWeekRaw.find((a) => a.tanggal === date)?.status ?? null,
    }));

    return { kehadiran, weeklyAbsensi };
  }
}
