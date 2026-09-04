import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { todayJakarta as todayStr, weekDatesJakarta as weekDates } from '../common/utils/jakarta-date.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const today = todayStr();
    const dates = weekDates();

    const [totalGuru, kegiatanHariIni, absensiHariIni, kegiatanWeek, absensiWeek, guruList] = await Promise.all([
      this.prisma.guru.count(),
      this.prisma.kegiatan.findMany({ where: { tanggal: today }, select: { id: true } }),
      this.prisma.absensiKegiatan.findMany({
        where: { kegiatan: { tanggal: today } },
        select: { guruId: true, kegiatanId: true, waktuAbsen: true },
      }),
      this.prisma.kegiatan.findMany({ where: { tanggal: { in: dates } }, select: { id: true, tanggal: true } }),
      this.prisma.absensiKegiatan.findMany({
        where: { kegiatan: { tanggal: { in: dates } } },
        select: { guruId: true, kegiatan: { select: { tanggal: true } } },
      }),
      this.prisma.guru.findMany({
        select: { id: true, nip: true, user: { select: { id: true, nama: true, fotoProfil: true } } },
        orderBy: { user: { nama: 'asc' } },
      }),
    ]);

    const guruSudahAbsenSet = new Set(absensiHariIni.map((a) => a.guruId));
    const guruSudahAbsen = guruSudahAbsenSet.size;
    const guruBelumAbsen = Math.max(0, totalGuru - guruSudahAbsen);

    const kegiatanByDate = new Map<string, number>();
    for (const k of kegiatanWeek) kegiatanByDate.set(k.tanggal, (kegiatanByDate.get(k.tanggal) ?? 0) + 1);
    const submisiByDate = new Map<string, Set<string>>();
    for (const a of absensiWeek) {
      const tgl = a.kegiatan.tanggal;
      if (!submisiByDate.has(tgl)) submisiByDate.set(tgl, new Set());
      submisiByDate.get(tgl)!.add(a.guruId);
    }

    const weeklyKegiatan = dates.map((date, i) => {
      const kegiatan = kegiatanByDate.get(date) ?? 0;
      const guruHadir = submisiByDate.get(date)?.size ?? 0;
      return {
        hari: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'][i],
        date,
        kegiatan,
        guruHadir,
        persen: totalGuru > 0 ? Math.round((guruHadir / totalGuru) * 100) : 0,
      };
    });

    const submisiCountByGuru = new Map<string, number>();
    for (const a of absensiHariIni) submisiCountByGuru.set(a.guruId, (submisiCountByGuru.get(a.guruId) ?? 0) + 1);
    const statusGuru = guruList.map((g) => ({
      guruId: g.id,
      nama: g.user?.nama ?? '-',
      nip: g.nip,
      fotoProfil: g.user?.fotoProfil ?? null,
      kegiatanDiabsen: submisiCountByGuru.get(g.id) ?? 0,
      totalKegiatanHariIni: kegiatanHariIni.length,
      sudahAbsen: guruSudahAbsenSet.has(g.id),
    }));

    return {
      totalGuru,
      kehadiranHariIni: {
        kegiatanHariIni: kegiatanHariIni.length,
        guruSudahAbsen,
        guruBelumAbsen,
        persen: totalGuru > 0 ? Math.round((guruSudahAbsen / totalGuru) * 100) : 0,
      },
      weeklyKegiatan,
      statusGuru,
    };
  }

  async getGuruStats(userId: string) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return { error: 'Profil guru tidak ditemukan' };

    const dates = weekDates();
    const today = todayStr();

    const [totalKegiatanLifetime, totalDiikutiLifetime, kegiatanHariIni, absensiHariIni, kegiatanWeek, absensiWeek] = await Promise.all([
      this.prisma.kegiatan.count(),
      this.prisma.absensiKegiatan.count({ where: { guruId: guru.id } }),
      this.prisma.kegiatan.findMany({ where: { tanggal: today }, select: { id: true } }),
      this.prisma.absensiKegiatan.findMany({ where: { guruId: guru.id, kegiatan: { tanggal: today } }, select: { kegiatanId: true } }),
      this.prisma.kegiatan.findMany({ where: { tanggal: { in: dates } }, select: { id: true, tanggal: true } }),
      this.prisma.absensiKegiatan.findMany({ where: { guruId: guru.id, kegiatan: { tanggal: { in: dates } } }, select: { kegiatan: { select: { tanggal: true } } } }),
    ]);

    const kehadiran = {
      totalKegiatanDiikuti: totalDiikutiLifetime,
      totalKegiatan: totalKegiatanLifetime,
      persen: totalKegiatanLifetime > 0 ? Math.round((totalDiikutiLifetime / totalKegiatanLifetime) * 100) : 0,
      kegiatanHariIni: kegiatanHariIni.length,
      sudahAbsenHariIni: absensiHariIni.length,
    };

    const kegiatanByDate = new Map<string, number>();
    for (const k of kegiatanWeek) kegiatanByDate.set(k.tanggal, (kegiatanByDate.get(k.tanggal) ?? 0) + 1);
    const submisiByDate = new Map<string, number>();
    for (const a of absensiWeek) {
      const tgl = a.kegiatan.tanggal;
      submisiByDate.set(tgl, (submisiByDate.get(tgl) ?? 0) + 1);
    }

    const weeklyKegiatan = dates.map((date, i) => {
      const kegiatan = kegiatanByDate.get(date) ?? 0;
      const diikuti = submisiByDate.get(date) ?? 0;
      return {
        hari: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'][i],
        date,
        kegiatan,
        diikuti,
        persen: kegiatan > 0 ? Math.round((diikuti / kegiatan) * 100) : 0,
      };
    });

    return { kehadiran, weeklyKegiatan };
  }
}
