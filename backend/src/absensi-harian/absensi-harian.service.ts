import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';
import { jakartaParts, todayJakarta as todayStr, effectiveWeekdaysInRange, monthToDateRange, addDaysUTC } from '../common/utils/jakarta-date.util';
import { isValidGpsLokasi } from '../common/utils/gps.util';

export type RangeGuruSummary = { HADIR: number; IZIN: number; SAKIT: number; ALPA: number; totalHariEfektif: number; persentaseKehadiran: number };
export type RangeGuruRow = {
  guruId: string;
  nama: string | null;
  nip: string | null;
  byTanggal: Record<string, {
    status: string | null; waktuAbsen: string | null; waktuPulang: string | null;
    foto: string | null; ttd: string | null; lokasi: string | null;
    fotoPulang: string | null; ttdPulang: string | null; lokasiPulang: string | null;
  }>;
  summary: RangeGuruSummary;
};
export type RekapRangeData = {
  tanggalMulai: string;
  tanggalSelesai: string;
  tanggalList: string[];
  guru: RangeGuruRow[];
};

export type AbsenWindow = 'HADIR' | 'PULANG' | 'BOTH' | 'CLOSED';

export type LaporanSeringTidakHadirRow = {
  guruId: string;
  nama: string | null;
  nip: string | null;
  fotoProfil: string | null;
  summary: RangeGuruSummary;
};
export type LaporanSeringTidakHadir = {
  periode: 'mingguan' | 'bulanan';
  tanggalMulai: string;
  tanggalSelesai: string;
  tanggalList: string[];
  guru: LaporanSeringTidakHadirRow[];
};

// Jadwal jendela absen (jam buka/tutup Datang & Pulang) kini datang dari
// tabel JadwalAbsenOverride per tanggal, dikelola lewat menu admin di
// Absensi Harian - bukan lagi konstanta tanggal hardcode yang butuh deploy
// ulang tiap ada perubahan jadwal darurat (mis. pulang lebih awal). Field
// yang null pada override berarti "pakai jadwal normal hari itu" untuk
// batas tersebut.
export type JadwalOverrideRow = {
  hadirStartMinutes: number | null;
  hadirEndMinutes: number | null;
  pulangStartMinutes: number | null;
  pulangEndMinutes: number | null;
  keterangan: string | null;
} | null;

// Jadwal normal: Absen Datang 06.00-09.00 WIB Senin-Jumat. Absen Pulang
// 14.00-17.00 WIB Senin-Kamis, atau 11.00-12.00 WIB khusus Jumat.
// Sabtu-Minggu tidak ada jendela absen sama sekali (override tidak berlaku
// di akhir pekan - lingkup fitur ini cuma menggeser jam pada hari efektif).
function defaultHadirStart(): number { return 6 * 60; }
function defaultHadirEnd(): number { return 9 * 60; }
function defaultPulangStart(isFriday: boolean): number { return isFriday ? 11 * 60 : 14 * 60; }
function defaultPulangEnd(isFriday: boolean): number { return isFriday ? 12 * 60 : 17 * 60; }

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}.${m}`;
}

function currentWindow(override: JadwalOverrideRow): AbsenWindow {
  const { hour, minute, dayOfWeek } = jakartaParts();
  const isMonFri = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (!isMonFri) return 'CLOSED';

  const minutesNow = hour * 60 + minute;
  const isFriday = dayOfWeek === 5;
  const hadirStart = override?.hadirStartMinutes ?? defaultHadirStart();
  const hadirEnd = override?.hadirEndMinutes ?? defaultHadirEnd();
  const pulangStart = override?.pulangStartMinutes ?? defaultPulangStart(isFriday);
  const pulangEnd = override?.pulangEndMinutes ?? defaultPulangEnd(isFriday);

  const hadirOpen = minutesNow >= hadirStart && minutesNow < hadirEnd;
  const pulangOpen = minutesNow >= pulangStart && minutesNow < pulangEnd;

  if (hadirOpen && pulangOpen) return 'BOTH';
  if (hadirOpen) return 'HADIR';
  if (pulangOpen) return 'PULANG';
  return 'CLOSED';
}

function pulangWindowLabel(override: JadwalOverrideRow): string {
  const { dayOfWeek } = jakartaParts();
  const isFriday = dayOfWeek === 5;
  const pulangStart = override?.pulangStartMinutes ?? defaultPulangStart(isFriday);
  const pulangEnd = override?.pulangEndMinutes ?? defaultPulangEnd(isFriday);
  const isOverridden = override != null && (override.pulangStartMinutes != null || override.pulangEndMinutes != null);
  const note = isOverridden ? `, hari ini disesuaikan${override?.keterangan ? ` (${override.keterangan})` : ''}` : '';
  return `${minutesLabel(pulangStart)}-${minutesLabel(pulangEnd)} WIB (${isFriday ? 'Jumat' : 'Senin-Kamis'}${note})`;
}

@Injectable()
export class AbsensiHarianService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Rekap semua guru untuk satu tanggal — dipakai admin memantau kehadiran
  // seluruh guru (read-only, admin tidak mengedit absensi guru lain).
  async getRekapSemuaGuru(tanggal: string) {
    const guruList = await this.prisma.guru.findMany({
      include: { user: { select: { id: true, nama: true, fotoProfil: true } } },
      orderBy: { user: { nama: 'asc' } },
    });

    const existing = await this.prisma.absensiHarian.findMany({ where: { tanggal } });
    const docMap = new Map(existing.map((a) => [a.guruId, a]));

    const rekap = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    let pulangCount = 0;
    const guru = guruList.map((g) => {
      const doc = docMap.get(g.id) ?? null;
      const status = doc?.status ?? null;
      if (status && status in rekap) rekap[status as keyof typeof rekap]++;
      if (doc?.waktuPulang) pulangCount++;
      return {
        guruId: g.id,
        userId: g.userId,
        nama: g.user?.nama ?? null,
        nip: g.nip,
        fotoProfil: g.user?.fotoProfil ?? null,
        status,
        waktuAbsen: doc?.waktuAbsen ?? null,
        lokasi: doc?.lokasi ?? null,
        foto: doc?.foto ?? null,
        ttd: doc?.ttd ?? null,
        catatan: doc?.catatan ?? null,
        waktuPulang: doc?.waktuPulang ?? null,
        lokasiPulang: doc?.lokasiPulang ?? null,
        fotoPulang: doc?.fotoPulang ?? null,
        ttdPulang: doc?.ttdPulang ?? null,
        catatanPulang: doc?.catatanPulang ?? null,
      };
    });

    return { tanggal, rekap, pulangCount, guru };
  }

  // GURU hanya melihat kehadirannya sendiri; ADMIN melihat rekap semua guru.
  async getForActor(userId: string, role: string, tanggal: string) {
    if (role === 'GURU') {
      const guru = await this.prisma.guru.findUnique({ where: { userId } });
      if (!guru) return this.getRekapSemuaGuru(tanggal);
      const doc = await this.prisma.absensiHarian.findUnique({
        where: { guruId_tanggal: { guruId: guru.id, tanggal } },
      });
      return {
        tanggal,
        rekap: { HADIR: doc?.status === 'HADIR' ? 1 : 0, IZIN: doc?.status === 'IZIN' ? 1 : 0, SAKIT: doc?.status === 'SAKIT' ? 1 : 0, ALPA: 0 },
        pulangCount: doc?.waktuPulang ? 1 : 0,
        guru: [{
          guruId: guru.id,
          status: doc?.status ?? null,
          waktuAbsen: doc?.waktuAbsen ?? null,
          lokasi: doc?.lokasi ?? null,
          foto: doc?.foto ?? null,
          ttd: doc?.ttd ?? null,
          catatan: doc?.catatan ?? null,
          waktuPulang: doc?.waktuPulang ?? null,
          lokasiPulang: doc?.lokasiPulang ?? null,
          fotoPulang: doc?.fotoPulang ?? null,
          ttdPulang: doc?.ttdPulang ?? null,
          catatanPulang: doc?.catatanPulang ?? null,
        }],
      };
    }
    return this.getRekapSemuaGuru(tanggal);
  }

  // "Sering tidak hadir" = guru dengan minimal satu catatan Alpa dalam
  // rolling window 7 hari (mingguan) atau 30 hari (bulanan) terakhir
  // (hari ini inklusif), bukan minggu/bulan kalender — supaya laporan tetap
  // relevan berapa pun tanggal hari ini. Diurutkan dari yang paling sering
  // alpa. Hanya hari efektif (Senin-Jumat) yang dihitung.
  async getLaporanSeringTidakHadir(periode: 'mingguan' | 'bulanan'): Promise<LaporanSeringTidakHadir> {
    const end = todayStr();
    const start = addDaysUTC(end, periode === 'bulanan' ? -29 : -6);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    const guruList = await this.prisma.guru.findMany({
      include: { user: { select: { nama: true, fotoProfil: true } } },
      orderBy: { user: { nama: 'asc' } },
    });
    const records = tanggalList.length > 0
      ? await this.prisma.absensiHarian.findMany({ where: { tanggal: { in: tanggalList } } })
      : [];
    const recMap = new Map(records.map((r) => [`${r.guruId}|${r.tanggal}`, r]));

    const guru = guruList
      .map((g) => {
        const row = this.buildRangeGuruRow(g.id, g.user?.nama ?? null, g.nip, tanggalList, recMap);
        return {
          guruId: row.guruId,
          nama: row.nama,
          nip: row.nip,
          fotoProfil: g.user?.fotoProfil ?? null,
          summary: row.summary,
        };
      })
      .filter((r) => r.summary.ALPA > 0)
      .sort((a, b) => b.summary.ALPA - a.summary.ALPA || a.summary.persentaseKehadiran - b.summary.persentaseKehadiran);

    return { periode, tanggalMulai: start, tanggalSelesai: end, tanggalList, guru };
  }

  async getRekapSemuaGuruForExport(tanggal: string) {
    return this.getRekapSemuaGuru(tanggal);
  }

  private buildRangeGuruRow(
    guruId: string,
    nama: string | null,
    nip: string | null,
    tanggalList: string[],
    recMap: Map<string, {
      status: string | null; waktuAbsen: string | null; waktuPulang: string | null;
      foto?: string | null; ttd?: string | null; lokasi?: string | null;
      fotoPulang?: string | null; ttdPulang?: string | null; lokasiPulang?: string | null;
    }>,
  ): RangeGuruRow {
    const byTanggal: RangeGuruRow['byTanggal'] = {};
    const tally = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    for (const tgl of tanggalList) {
      const rec = recMap.get(`${guruId}|${tgl}`);
      const status = rec?.status ?? null;
      byTanggal[tgl] = {
        status, waktuAbsen: rec?.waktuAbsen ?? null, waktuPulang: rec?.waktuPulang ?? null,
        foto: rec?.foto ?? null, ttd: rec?.ttd ?? null, lokasi: rec?.lokasi ?? null,
        fotoPulang: rec?.fotoPulang ?? null, ttdPulang: rec?.ttdPulang ?? null, lokasiPulang: rec?.lokasiPulang ?? null,
      };
      // A day with no record at all counts as Alpa in the RANGE SUMMARY only
      // (unlike the single-day rekap, which leaves null status uncounted) —
      // otherwise the 4 categories wouldn't add up to totalHariEfektif, and a
      // multi-week/month recap needs that invariant to read as a real report.
      const tallyKey = (status ?? 'ALPA') as keyof typeof tally;
      if (tallyKey in tally) tally[tallyKey]++;
    }
    const totalHariEfektif = tanggalList.length;
    const persentaseKehadiran = totalHariEfektif > 0 ? Math.round((tally.HADIR / totalHariEfektif) * 1000) / 10 : 0;
    return { guruId, nama, nip, byTanggal, summary: { ...tally, totalHariEfektif, persentaseKehadiran } };
  }

  private resolveRange(
    mode: 'mingguan' | 'bulanan',
    tanggalMulai?: string,
    tanggalSelesai?: string,
    bulan?: string,
    tahun?: string,
  ): { start: string; end: string } {
    if (mode === 'bulanan') {
      const b = Number(bulan);
      const t = Number(tahun);
      if (!Number.isInteger(b) || b < 1 || b > 12 || !Number.isInteger(t)) {
        throw new BadRequestException('bulan/tahun tidak valid');
      }
      return monthToDateRange(b, t);
    }
    if (!tanggalMulai || !tanggalSelesai) {
      throw new BadRequestException('tanggalMulai/tanggalSelesai wajib diisi untuk mode mingguan');
    }
    if (tanggalMulai > tanggalSelesai) {
      throw new BadRequestException('tanggalMulai harus sebelum atau sama dengan tanggalSelesai');
    }
    return { start: tanggalMulai, end: tanggalSelesai };
  }

  async getRekapSemuaGuruRangeForExport(
    mode: 'mingguan' | 'bulanan',
    opts: { tanggalMulai?: string; tanggalSelesai?: string; bulan?: string; tahun?: string },
  ): Promise<RekapRangeData> {
    const { start, end } = this.resolveRange(mode, opts.tanggalMulai, opts.tanggalSelesai, opts.bulan, opts.tahun);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    const guruList = await this.prisma.guru.findMany({
      include: { user: { select: { nama: true } } },
      orderBy: { user: { nama: 'asc' } },
    });
    const records = tanggalList.length > 0
      ? await this.prisma.absensiHarian.findMany({ where: { tanggal: { in: tanggalList } } })
      : [];
    const recMap = new Map(records.map((r) => [`${r.guruId}|${r.tanggal}`, r]));

    const guru = guruList.map((g) =>
      this.buildRangeGuruRow(g.id, g.user?.nama ?? null, g.nip, tanggalList, recMap),
    );

    return { tanggalMulai: start, tanggalSelesai: end, tanggalList, guru };
  }

  async getGuruAbsensiRangeForExport(
    guruId: string,
    mode: 'mingguan' | 'bulanan',
    opts: { tanggalMulai?: string; tanggalSelesai?: string; bulan?: string; tahun?: string },
  ): Promise<RekapRangeData> {
    const guru = await this.assertGuruExists(guruId);
    const { start, end } = this.resolveRange(mode, opts.tanggalMulai, opts.tanggalSelesai, opts.bulan, opts.tahun);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    const records = tanggalList.length > 0
      ? await this.prisma.absensiHarian.findMany({ where: { guruId, tanggal: { in: tanggalList } } })
      : [];
    const recMap = new Map(records.map((r) => [`${r.guruId}|${r.tanggal}`, r]));
    const row = this.buildRangeGuruRow(guru.id, guru.user?.nama ?? null, guru.nip, tanggalList, recMap);

    return { tanggalMulai: start, tanggalSelesai: end, tanggalList, guru: [row] };
  }

  private async assertGuruExists(guruId: string) {
    const guru = await this.prisma.guru.findUnique({
      where: { id: guruId },
      include: { user: { select: { nama: true } } },
    });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    return guru;
  }

  async getGuruAbsensiForExport(guruId: string, tanggal: string) {
    const guru = await this.assertGuruExists(guruId);
    const doc = await this.prisma.absensiHarian.findUnique({
      where: { guruId_tanggal: { guruId, tanggal } },
    });
    return {
      tanggal,
      guru: [
        {
          guruId: guru.id,
          nama: guru.user?.nama ?? null,
          nip: guru.nip,
          status: doc?.status ?? null,
          waktuAbsen: doc?.waktuAbsen ?? null,
          lokasi: doc?.lokasi ?? null,
          foto: doc?.foto ?? null,
          ttd: doc?.ttd ?? null,
          catatan: doc?.catatan ?? null,
          waktuPulang: doc?.waktuPulang ?? null,
          lokasiPulang: doc?.lokasiPulang ?? null,
          fotoPulang: doc?.fotoPulang ?? null,
          ttdPulang: doc?.ttdPulang ?? null,
          catatanPulang: doc?.catatanPulang ?? null,
        },
      ],
    };
  }

  async getTtdImage(guruId: string, tanggal: string, tipe: 'hadir' | 'pulang') {
    await this.assertGuruExists(guruId);
    const doc = await this.prisma.absensiHarian.findUnique({
      where: { guruId_tanggal: { guruId, tanggal } },
    });
    const raw = tipe === 'pulang' ? doc?.ttdPulang : doc?.ttd;
    if (!raw) return null;
    const match = /^data:image\/(png|jpe?g);base64,([a-zA-Z0-9+/=]+)$/.exec(raw.trim());
    if (!match) return null;
    return {
      buffer: Buffer.from(match[2], 'base64'),
      mime: `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`,
    };
  }

  async getStatusSaya(userId: string, tanggal?: string) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    const override = await this.getOverrideForDate(todayStr());
    const window = currentWindow(override);
    const pulangLabel = pulangWindowLabel(override);
    if (!guru) return { sudahAbsen: false, sudahPulang: false, status: null, window, pulangLabel };
    const tgl = tanggal || todayStr();
    const record = await this.prisma.absensiHarian.findUnique({
      where: { guruId_tanggal: { guruId: guru.id, tanggal: tgl } },
    });
    return {
      // "sudahAbsen" specifically means a Datang (HADIR/IZIN/SAKIT) submission
      // exists — not just "some row exists for today", since a Pulang-only
      // row (no prior Hadir) must not read as "already absen datang".
      sudahAbsen: !!record?.waktuAbsen,
      sudahPulang: !!record?.waktuPulang,
      status: record?.status ?? null,
      tanggal: tgl,
      window,
      pulangLabel,
      record,
    };
  }

  async absenSendiri(
    userId: string,
    tipe: 'HADIR' | 'PULANG' | 'IZIN' | 'SAKIT',
    extras: { lokasi?: string; waktuAbsen?: string; ttd?: string; fotoUrl?: string; catatan?: string } = {},
  ) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) throw new NotFoundException('Profil guru tidak ditemukan');

    const tanggal = todayStr();
    const override = await this.getOverrideForDate(tanggal);
    const window = currentWindow(override);
    const existing = await this.prisma.absensiHarian.findUnique({
      where: { guruId_tanggal: { guruId: guru.id, tanggal } },
    });

    if (tipe === 'PULANG') {
      if (window !== 'PULANG' && window !== 'BOTH') {
        throw new ForbiddenException(
          window === 'HADIR'
            ? `Absen pulang belum tersedia. Absen pulang dibuka jam ${pulangWindowLabel(override)}`
            : `Waktu absen pulang hari ini sudah berakhir atau belum dibuka. Jendela pulang: ${pulangWindowLabel(override)}`,
        );
      }
      if (!extras.fotoUrl) throw new BadRequestException('Foto wajib diisi untuk absen pulang');
      if (!isValidGpsLokasi(extras.lokasi)) throw new BadRequestException('Lokasi (GPS) wajib diisi dan harus berupa koordinat valid untuk absen pulang');
      if (!extras.ttd) throw new BadRequestException('Tanda tangan wajib diisi untuk absen pulang');

      // Pulang is allowed even without a prior Hadir, but it must never set/imply status HADIR by itself —
      // status stays whatever it already was (null/IZIN/SAKIT/ALPA/HADIR untouched).
      const pulangData = {
        lokasiPulang: extras.lokasi,
        waktuPulang: extras.waktuAbsen,
        ttdPulang: extras.ttd,
        fotoPulang: extras.fotoUrl,
        catatanPulang: extras.catatan,
      };
      return this.prisma.absensiHarian.upsert({
        where: { guruId_tanggal: { guruId: guru.id, tanggal } },
        update: pulangData,
        create: { guruId: guru.id, tanggal, ...pulangData },
      });
    }

    // HADIR / IZIN / SAKIT — one submission per day
    if (window !== 'HADIR' && window !== 'BOTH') {
      throw new ForbiddenException('Absen datang hanya tersedia jam 06.00-09.00 WIB (Senin-Jumat)');
    }
    if (existing?.status) {
      throw new BadRequestException('Anda sudah mengisi absensi hari ini');
    }
    if (tipe === 'HADIR') {
      if (!extras.fotoUrl) throw new BadRequestException('Foto wajib diisi untuk absen hadir');
      if (!isValidGpsLokasi(extras.lokasi)) throw new BadRequestException('Lokasi (GPS) wajib diisi dan harus berupa koordinat valid untuk absen hadir');
      if (!extras.ttd) throw new BadRequestException('Tanda tangan wajib diisi untuk absen hadir');
    }
    if (tipe === 'IZIN' || tipe === 'SAKIT') {
      if (!extras.catatan?.trim()) throw new BadRequestException('Keterangan wajib diisi untuk Izin/Sakit');
      if (!extras.fotoUrl) throw new BadRequestException('Foto surat izin/sakit wajib diisi');
      if (!isValidGpsLokasi(extras.lokasi)) throw new BadRequestException('Lokasi (GPS) wajib diisi dan harus berupa koordinat valid untuk Izin/Sakit');
      if (!extras.ttd) throw new BadRequestException('Tanda tangan wajib diisi untuk Izin/Sakit');
    }

    const data = {
      status: tipe,
      lokasi: extras.lokasi,
      waktuAbsen: extras.waktuAbsen,
      ttd: extras.ttd,
      foto: extras.fotoUrl,
      catatan: extras.catatan,
    };

    return this.prisma.absensiHarian.upsert({
      where: { guruId_tanggal: { guruId: guru.id, tanggal } },
      update: data,
      create: { guruId: guru.id, tanggal, ...data },
    });
  }

  // Dipanggil dari tombol "Kirim Pengingat" admin — mengirim notifikasi
  // in-app ke guru yang belum tercatat hadir (status kosong atau ALPA) pada
  // tanggal terpilih.
  async kirimPengingatBelumAbsen(tanggal: string) {
    const guruList = await this.prisma.guru.findMany({
      select: { id: true, userId: true },
    });
    const existing = await this.prisma.absensiHarian.findMany({
      where: { tanggal },
      select: { guruId: true, status: true },
    });
    const statusMap = new Map(existing.map((a) => [a.guruId, a.status]));
    const belumAbsenUserIds = guruList
      .filter((g) => {
        const status = statusMap.get(g.id) ?? null;
        return status === null || status === 'ALPA';
      })
      .map((g) => g.userId);

    if (belumAbsenUserIds.length === 0) return { count: 0 };

    await this.notificationService.createMany(belumAbsenUserIds, {
      title:   'Pengingat Absen',
      message: `Anda belum tercatat absen hari ini. Segera lakukan presensi.`,
      type:    NotificationType.ABSENSI,
      link:    '/guru/absensi-harian',
    });

    return { count: belumAbsenUserIds.length };
  }

  private async getOverrideForDate(tanggal: string): Promise<JadwalOverrideRow> {
    return this.prisma.jadwalAbsenOverride.findUnique({
      where: { tanggal },
      select: { hadirStartMinutes: true, hadirEndMinutes: true, pulangStartMinutes: true, pulangEndMinutes: true, keterangan: true },
    });
  }

  // Jadwal hari ini (efektif, sudah menggabungkan default + override kalau
  // ada) - dipakai kartu "Jadwal Absen" di halaman admin supaya admin selalu
  // lihat jam yang BENAR-BENAR berlaku sekarang, bukan cuma jadwal normal.
  async getJadwalHariIni() {
    const tanggal = todayStr();
    const { dayOfWeek } = jakartaParts();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFriday = dayOfWeek === 5;
    const override = await this.prisma.jadwalAbsenOverride.findUnique({ where: { tanggal } });
    return {
      tanggal,
      isWeekend,
      hadirStartMinutes: override?.hadirStartMinutes ?? defaultHadirStart(),
      hadirEndMinutes: override?.hadirEndMinutes ?? defaultHadirEnd(),
      pulangStartMinutes: override?.pulangStartMinutes ?? defaultPulangStart(isFriday),
      pulangEndMinutes: override?.pulangEndMinutes ?? defaultPulangEnd(isFriday),
      override,
      window: isWeekend ? 'CLOSED' : currentWindow(override),
    };
  }

  // 14 hari ke belakang s.d. 60 hari ke depan - cukup untuk lihat riwayat
  // terbaru dan menjadwalkan penyesuaian mendatang tanpa daftar tak terbatas.
  async listJadwalOverride() {
    const today = todayStr();
    return this.prisma.jadwalAbsenOverride.findMany({
      where: { tanggal: { gte: addDaysUTC(today, -14), lte: addDaysUTC(today, 60) } },
      orderBy: { tanggal: 'asc' },
      include: { createdBy: { select: { id: true, nama: true } } },
    });
  }

  async upsertJadwalOverride(
    tanggal: string,
    dto: { hadirStartMinutes?: number | null; hadirEndMinutes?: number | null; pulangStartMinutes?: number | null; pulangEndMinutes?: number | null; keterangan?: string | null },
    adminId: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new BadRequestException('Format tanggal tidak valid');

    const checks: [string, number | null | undefined][] = [
      ['Jam mulai datang', dto.hadirStartMinutes],
      ['Jam selesai datang', dto.hadirEndMinutes],
      ['Jam mulai pulang', dto.pulangStartMinutes],
      ['Jam selesai pulang', dto.pulangEndMinutes],
    ];
    for (const [label, v] of checks) {
      if (v != null && (!Number.isInteger(v) || v < 0 || v > 1439)) {
        throw new BadRequestException(`${label} tidak valid`);
      }
    }
    if (dto.hadirStartMinutes != null && dto.hadirEndMinutes != null && dto.hadirStartMinutes >= dto.hadirEndMinutes) {
      throw new BadRequestException('Jam mulai datang harus lebih awal dari jam selesai datang');
    }
    if (dto.pulangStartMinutes != null && dto.pulangEndMinutes != null && dto.pulangStartMinutes >= dto.pulangEndMinutes) {
      throw new BadRequestException('Jam mulai pulang harus lebih awal dari jam selesai pulang');
    }

    const data = {
      hadirStartMinutes: dto.hadirStartMinutes ?? null,
      hadirEndMinutes: dto.hadirEndMinutes ?? null,
      pulangStartMinutes: dto.pulangStartMinutes ?? null,
      pulangEndMinutes: dto.pulangEndMinutes ?? null,
      keterangan: dto.keterangan?.trim() || null,
      createdById: adminId,
    };
    return this.prisma.jadwalAbsenOverride.upsert({
      where: { tanggal },
      create: { tanggal, ...data },
      update: data,
    });
  }

  async deleteJadwalOverride(tanggal: string) {
    const existing = await this.prisma.jadwalAbsenOverride.findUnique({ where: { tanggal } });
    if (!existing) throw new NotFoundException('Override jadwal tidak ditemukan untuk tanggal ini');
    await this.prisma.jadwalAbsenOverride.delete({ where: { tanggal } });
    return { message: 'Override jadwal dihapus, jadwal kembali normal untuk tanggal ini' };
  }
}
