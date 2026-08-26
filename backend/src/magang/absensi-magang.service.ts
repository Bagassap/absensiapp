import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';
import { todayJakarta as todayStr, effectiveWeekdaysInRange, monthToDateRange } from '../common/utils/jakarta-date.util';
import { isValidGpsLokasi } from '../common/utils/gps.util';

type BimbinganPenempatan = { id: string; siswaId: string; tempatMagangId: string };

export type RangeSiswaSummary = { HADIR: number; IZIN: number; SAKIT: number; ALPA: number; totalHariEfektif: number; persentaseKehadiran: number };
export type RangeSiswaRow = {
  siswaId: string;
  nama: string | null;
  nis: string | null;
  byTanggal: Record<string, {
    status: string | null; waktuAbsen: string | null; waktuPulang: string | null;
    foto: string | null; ttd: string | null; lokasi: string | null;
    fotoPulang: string | null; ttdPulang: string | null; lokasiPulang: string | null;
  }>;
  summary: RangeSiswaSummary;
};
export type RekapRangeData = {
  tempatMagang: { namaTempat: string } | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  tanggalList: string[];
  siswa: RangeSiswaRow[];
};

@Injectable()
export class AbsensiMagangService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Daftar penempatan AKTIF di mana user ini adalah guru pembimbingnya —
  // dasar dari pembatasan "guru pembimbing hanya lihat siswa bimbingannya".
  private async getBimbinganAktif(userId: string): Promise<BimbinganPenempatan[]> {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return [];
    return this.prisma.penempatanMagang.findMany({
      where: { guruPembimbingId: guru.id, status: 'AKTIF' },
      select: { id: true, siswaId: true, tempatMagangId: true },
    });
  }

  private async getRekapTempat(tempatMagangId: string, tanggal: string, onlySiswaIds?: string[]) {
    const tempat = await this.prisma.tempatMagang.findUnique({ where: { id: tempatMagangId } });
    if (!tempat) throw new NotFoundException('Tempat magang tidak ditemukan');

    const penempatanList = await this.prisma.penempatanMagang.findMany({
      where: {
        tempatMagangId,
        status: 'AKTIF',
        ...(onlySiswaIds ? { siswaId: { in: onlySiswaIds } } : {}),
      },
      include: {
        siswa: { include: { user: { select: { id: true, nama: true, fotoProfil: true } } } },
        guruPembimbing: { select: { id: true, user: { select: { id: true, nama: true } } } },
      },
      orderBy: { siswa: { nama: 'asc' } },
    });

    const existing = penempatanList.length
      ? await this.prisma.absensiMagang.findMany({
          where: { penempatanId: { in: penempatanList.map((p) => p.id) }, tanggal },
        })
      : [];
    const docMap = new Map(existing.map((a) => [a.penempatanId, a]));

    const rekap = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    let pulangCount = 0;
    const siswa = penempatanList.map((p) => {
      const doc = docMap.get(p.id) ?? null;
      const status = doc?.status ?? null;
      if (status && status in rekap) rekap[status as keyof typeof rekap]++;
      if (doc?.waktuPulang) pulangCount++;
      return {
        penempatanId: p.id,
        siswaId: p.siswaId,
        userId: p.siswa.userId,
        nama: p.siswa.user?.nama ?? p.siswa.nama,
        nis: p.siswa.nis,
        fotoProfil: p.siswa.user?.fotoProfil ?? null,
        guruPembimbing: { id: p.guruPembimbing.id, nama: p.guruPembimbing.user?.nama ?? null },
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

    return { tempatMagangId, tempatMagang: tempat, tanggal, rekap, pulangCount, siswa };
  }

  private async getAllRekapAdmin(tanggal: string) {
    const tempatList = await this.prisma.tempatMagang.findMany({ select: { id: true }, orderBy: { namaTempat: 'asc' } });
    return Promise.all(tempatList.map((t) => this.getRekapTempat(t.id, tanggal)));
  }

  async getForActor(userId: string, role: string, tanggal: string, tempatMagangId?: string) {
    if (role === 'GURU') {
      const bimbingan = await this.getBimbinganAktif(userId);
      const byTempat = new Map<string, string[]>();
      for (const b of bimbingan) {
        const list = byTempat.get(b.tempatMagangId) ?? [];
        list.push(b.siswaId);
        byTempat.set(b.tempatMagangId, list);
      }
      if (tempatMagangId) {
        const siswaIds = byTempat.get(tempatMagangId);
        if (!siswaIds) throw new ForbiddenException('Anda bukan pembimbing PKL untuk siswa di tempat ini');
        return [await this.getRekapTempat(tempatMagangId, tanggal, siswaIds)];
      }
      return Promise.all(
        Array.from(byTempat.entries()).map(([tId, siswaIds]) => this.getRekapTempat(tId, tanggal, siswaIds)),
      );
    }

    if (tempatMagangId) return [await this.getRekapTempat(tempatMagangId, tanggal)];
    return this.getAllRekapAdmin(tanggal);
  }

  async getStatusSaya(userId: string, tanggal?: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) return { hasPenempatan: false, sudahAbsen: false, sudahPulang: false, status: null };

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId: siswa.id, status: 'AKTIF' },
      include: { tempatMagang: true },
    });
    if (!penempatan) return { hasPenempatan: false, sudahAbsen: false, sudahPulang: false, status: null };

    const tgl = tanggal || todayStr();
    const record = await this.prisma.absensiMagang.findUnique({
      where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal: tgl } },
    });
    return {
      hasPenempatan: true,
      tempatMagang: penempatan.tempatMagang,
      sudahAbsen: !!record?.waktuAbsen,
      sudahPulang: !!record?.waktuPulang,
      status: record?.status ?? null,
      tanggal: tgl,
      record,
    };
  }

  async absenSendiri(
    userId: string,
    tipe: 'HADIR' | 'PULANG' | 'IZIN' | 'SAKIT',
    extras: { lokasi?: string; waktuAbsen?: string; ttd?: string; fotoUrl?: string; catatan?: string } = {},
  ) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new NotFoundException('Profil siswa tidak ditemukan');

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId: siswa.id, status: 'AKTIF' },
    });
    if (!penempatan) throw new BadRequestException('Anda tidak memiliki penempatan PKL yang aktif saat ini');

    const tanggal = todayStr();
    const existing = await this.prisma.absensiMagang.findUnique({
      where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
    });

    if (tipe === 'PULANG') {
      if (!extras.fotoUrl) throw new BadRequestException('Foto wajib diisi untuk absen pulang');
      if (!isValidGpsLokasi(extras.lokasi)) throw new BadRequestException('Lokasi (GPS) wajib diisi dan harus berupa koordinat valid untuk absen pulang');
      if (!extras.ttd) throw new BadRequestException('Tanda tangan wajib diisi untuk absen pulang');

      const pulangData = {
        lokasiPulang: extras.lokasi,
        waktuPulang: extras.waktuAbsen,
        ttdPulang: extras.ttd,
        fotoPulang: extras.fotoUrl,
        catatanPulang: extras.catatan,
      };
      return this.prisma.absensiMagang.upsert({
        where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
        update: pulangData,
        create: { siswaId: siswa.id, penempatanId: penempatan.id, tempatMagangId: penempatan.tempatMagangId, tanggal, ...pulangData },
      });
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

    return this.prisma.absensiMagang.upsert({
      where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
      update: data,
      create: { siswaId: siswa.id, penempatanId: penempatan.id, tempatMagangId: penempatan.tempatMagangId, tanggal, ...data },
    });
  }

  async upsertAbsensi(
    tempatMagangId: string,
    tanggal: string,
    absensi: { siswaId: string; status: string }[],
    actorUserId: string,
    actorRole: string,
  ) {
    const penempatanList = await this.prisma.penempatanMagang.findMany({
      where: { tempatMagangId, status: 'AKTIF' },
      select: { id: true, siswaId: true, guruPembimbingId: true },
    });
    const penempatanBySiswa = new Map(penempatanList.map((p) => [p.siswaId, p]));

    const invalid = absensi.find((a) => !penempatanBySiswa.has(a.siswaId));
    if (invalid) {
      throw new ForbiddenException('Terdapat siswa yang bukan bagian dari penempatan aktif di tempat ini');
    }

    if (actorRole === 'GURU') {
      const guru = await this.prisma.guru.findUnique({ where: { userId: actorUserId } });
      const bukanBimbingan = absensi.find((a) => penempatanBySiswa.get(a.siswaId)!.guruPembimbingId !== guru?.id);
      if (bukanBimbingan) {
        throw new ForbiddenException('Anda hanya bisa mengisi absensi siswa yang Anda bimbing');
      }
    }

    const ops = absensi.map((item) => {
      const penempatan = penempatanBySiswa.get(item.siswaId)!;
      return this.prisma.absensiMagang.upsert({
        where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } },
        update: { status: item.status },
        create: { siswaId: item.siswaId, penempatanId: penempatan.id, tempatMagangId, tanggal, status: item.status },
      });
    });
    const result = await this.prisma.$transaction(ops);

    const tempat = await this.prisma.tempatMagang.findUnique({ where: { id: tempatMagangId }, select: { namaTempat: true } });
    const siswaUsers = await this.prisma.siswa.findMany({
      where: { id: { in: absensi.map((a) => a.siswaId) }, userId: { not: null } },
      select: { userId: true },
    });
    await this.notificationService.createMany(
      siswaUsers.map((s) => s.userId!),
      {
        title:   'Absensi PKL diperbarui',
        message: `Absensi PKL di ${tempat?.namaTempat ?? ''} tanggal ${tanggal} telah diisi`,
        type:    NotificationType.ABSENSI,
        link:    '/magang/absensi',
      },
    );

    return result;
  }

  // Guru pembimbing hanya boleh mengekspor tempat yang punya minimal satu
  // siswa bimbingannya di sana — sama seperti pola akses baca (getForActor).
  private async assertTempatAccessible(tempatMagangId: string, userId: string, role: string): Promise<string[] | undefined> {
    if (role !== 'GURU') return undefined;
    const bimbingan = await this.getBimbinganAktif(userId);
    const siswaIds = bimbingan.filter((b) => b.tempatMagangId === tempatMagangId).map((b) => b.siswaId);
    if (siswaIds.length === 0) throw new ForbiddenException('Anda bukan pembimbing PKL untuk siswa di tempat ini');
    return siswaIds;
  }

  async getRekapTempatForExport(tempatMagangId: string, tanggal: string, userId: string, role: string) {
    const onlySiswaIds = await this.assertTempatAccessible(tempatMagangId, userId, role);
    return this.getRekapTempat(tempatMagangId, tanggal, onlySiswaIds);
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

  private buildRangeSiswaRow(
    siswaId: string,
    nama: string | null,
    nis: string | null,
    tanggalList: string[],
    recMap: Map<string, {
      status: string | null; waktuAbsen: string | null; waktuPulang: string | null;
      foto?: string | null; ttd?: string | null; lokasi?: string | null;
      fotoPulang?: string | null; ttdPulang?: string | null; lokasiPulang?: string | null;
    }>,
  ): RangeSiswaRow {
    const byTanggal: RangeSiswaRow['byTanggal'] = {};
    const tally = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    for (const tgl of tanggalList) {
      const rec = recMap.get(`${siswaId}|${tgl}`);
      const status = rec?.status ?? null;
      byTanggal[tgl] = {
        status, waktuAbsen: rec?.waktuAbsen ?? null, waktuPulang: rec?.waktuPulang ?? null,
        foto: rec?.foto ?? null, ttd: rec?.ttd ?? null, lokasi: rec?.lokasi ?? null,
        fotoPulang: rec?.fotoPulang ?? null, ttdPulang: rec?.ttdPulang ?? null, lokasiPulang: rec?.lokasiPulang ?? null,
      };
      const tallyKey = (status ?? 'ALPA') as keyof typeof tally;
      if (tallyKey in tally) tally[tallyKey]++;
    }
    const totalHariEfektif = tanggalList.length;
    const persentaseKehadiran = totalHariEfektif > 0 ? Math.round((tally.HADIR / totalHariEfektif) * 1000) / 10 : 0;
    return { siswaId, nama, nis, byTanggal, summary: { ...tally, totalHariEfektif, persentaseKehadiran } };
  }

  async getRekapTempatRangeForExport(
    tempatMagangId: string,
    mode: 'mingguan' | 'bulanan',
    userId: string,
    role: string,
    opts: { tanggalMulai?: string; tanggalSelesai?: string; bulan?: string; tahun?: string },
  ): Promise<RekapRangeData> {
    const onlySiswaIds = await this.assertTempatAccessible(tempatMagangId, userId, role);
    const tempat = await this.prisma.tempatMagang.findUnique({ where: { id: tempatMagangId } });
    if (!tempat) throw new NotFoundException('Tempat magang tidak ditemukan');

    const { start, end } = this.resolveRange(mode, opts.tanggalMulai, opts.tanggalSelesai, opts.bulan, opts.tahun);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    const penempatanList = await this.prisma.penempatanMagang.findMany({
      where: { tempatMagangId, status: 'AKTIF', ...(onlySiswaIds ? { siswaId: { in: onlySiswaIds } } : {}) },
      include: { siswa: { include: { user: { select: { nama: true } } } } },
      orderBy: { siswa: { nama: 'asc' } },
    });
    const records = tanggalList.length && penempatanList.length
      ? await this.prisma.absensiMagang.findMany({ where: { penempatanId: { in: penempatanList.map((p) => p.id) }, tanggal: { in: tanggalList } } })
      : [];
    const recMap = new Map(records.map((r) => [`${r.siswaId}|${r.tanggal}`, r]));

    const siswa = penempatanList.map((p) =>
      this.buildRangeSiswaRow(p.siswaId, p.siswa.user?.nama ?? p.siswa.nama, p.siswa.nis, tanggalList, recMap),
    );

    return { tempatMagang: { namaTempat: tempat.namaTempat }, tanggalMulai: start, tanggalSelesai: end, tanggalList, siswa };
  }

  private async assertSiswaAccessible(siswaId: string, userId: string, role: string) {
    const siswa = await this.prisma.siswa.findUnique({
      where: { id: siswaId },
      include: { user: { select: { nama: true } } },
    });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');
    if (role === 'GURU') {
      const bimbingan = await this.getBimbinganAktif(userId);
      if (!bimbingan.some((b) => b.siswaId === siswaId)) {
        throw new ForbiddenException('Anda bukan pembimbing PKL untuk siswa ini');
      }
    }
    if (role === 'SISWA' && siswa.userId !== userId) {
      throw new ForbiddenException('Anda hanya bisa mengakses data absensi milik sendiri');
    }
    return siswa;
  }

  // Dipakai endpoint self-service siswa (export rekap sendiri) — siswaId tidak
  // pernah dipercaya dari klien, selalu diturunkan dari token JWT sendiri.
  async resolveOwnSiswaId(userId: string): Promise<string> {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId }, select: { id: true } });
    if (!siswa) throw new NotFoundException('Profil siswa tidak ditemukan');
    return siswa.id;
  }

  async getSiswaAbsensiForExport(siswaId: string, tanggal: string, userId: string, role: string) {
    const siswa = await this.assertSiswaAccessible(siswaId, userId, role);
    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId, status: 'AKTIF' },
      include: { tempatMagang: true },
    });
    const doc = penempatan
      ? await this.prisma.absensiMagang.findUnique({ where: { penempatanId_tanggal: { penempatanId: penempatan.id, tanggal } } })
      : null;
    return {
      tempatMagang: penempatan ? { namaTempat: penempatan.tempatMagang.namaTempat } : null,
      tanggal,
      siswa: [
        {
          siswaId: siswa.id,
          nama: siswa.user?.nama ?? siswa.nama,
          nis: siswa.nis,
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

  async getSiswaAbsensiRangeForExport(
    siswaId: string,
    mode: 'mingguan' | 'bulanan',
    userId: string,
    role: string,
    opts: { tanggalMulai?: string; tanggalSelesai?: string; bulan?: string; tahun?: string },
  ): Promise<RekapRangeData> {
    const siswa = await this.assertSiswaAccessible(siswaId, userId, role);
    const { start, end } = this.resolveRange(mode, opts.tanggalMulai, opts.tanggalSelesai, opts.bulan, opts.tahun);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId, status: 'AKTIF' },
      include: { tempatMagang: true },
    });
    const records = tanggalList.length && penempatan
      ? await this.prisma.absensiMagang.findMany({ where: { penempatanId: penempatan.id, tanggal: { in: tanggalList } } })
      : [];
    const recMap = new Map(records.map((r) => [`${r.siswaId}|${r.tanggal}`, r]));
    const row = this.buildRangeSiswaRow(siswa.id, siswa.user?.nama ?? siswa.nama, siswa.nis, tanggalList, recMap);

    return {
      tempatMagang: penempatan ? { namaTempat: penempatan.tempatMagang.namaTempat } : null,
      tanggalMulai: start,
      tanggalSelesai: end,
      tanggalList,
      siswa: [row],
    };
  }
}
