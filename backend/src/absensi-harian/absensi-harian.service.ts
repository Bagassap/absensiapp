import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';
import { jakartaParts, todayJakarta as todayStr, effectiveWeekdaysInRange, monthToDateRange, addDaysUTC, hariFor } from '../common/utils/jakarta-date.util';
import { isValidGpsLokasi } from '../common/utils/gps.util';

export type KegiatanWindow = 'BELUM_MULAI' | 'BUKA' | 'TUTUP';

export type KegiatanRow = {
  id: string;
  nama: string;
  tanggal: string;
  jamMulai: number;
  jamSelesai: number;
  keterangan: string | null;
  window: KegiatanWindow;
};

// "Apel Pagi" dan "Piket Harian" selalu online setiap hari tanpa admin
// perlu membuatnya manual — beda dengan kegiatan lain (Upacara, Rapat, dst)
// yang tetap wajib disetel lewat "Tambah Kegiatan". Jendela dibuat seharian
// penuh (00.00-23.59) supaya benar-benar selalu terbuka; admin masih bisa
// mempersempit jamnya lewat Edit kalau perlu, hanya saja baris ini otomatis
// dibuatkan lagi kalau suatu tanggal belum punya keduanya. `aliases` (lower-
// case) mengenali kegiatan yang admin sudah buat manual sebelum fitur ini
// ada (mis. "APEL", "PIKET HARIAN") supaya tidak dibuat duplikat.
const STANDING_KEGIATAN: { nama: string; aliases: string[]; jamMulai: number; jamSelesai: number }[] = [
  { nama: 'Apel Pagi', aliases: ['apel pagi', 'apel'], jamMulai: 0, jamSelesai: 1439 },
  { nama: 'Piket Harian', aliases: ['piket harian', 'piket'], jamMulai: 0, jamSelesai: 1439 },
];
const APEL_ALIASES = STANDING_KEGIATAN[0].aliases;
const PIKET_ALIASES = STANDING_KEGIATAN[1].aliases;
const isApelKegiatan = (nama: string) => APEL_ALIASES.includes(nama.trim().toLowerCase());
const isPiketKegiatan = (nama: string) => PIKET_ALIASES.includes(nama.trim().toLowerCase());

// Hari yang punya jadwal piket (lihat JadwalPiket, diisi dari
// Jadwal_Piket_Tendik_2026-2027.xlsx) — Sabtu/Minggu tidak ada jadwal jadi
// aturan "piket vs apel" di bawah tidak berlaku, kedua kegiatan tetap
// tampil apa adanya kalau kebetulan ada baris untuk hari itu.
const HARI_BERJADWAL_PIKET = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];

export type AbsensiKegiatanRow = {
  id: string;
  guruId: string;
  nama: string | null;
  nip: string | null;
  npy: string | null;
  fotoProfil: string | null;
  kegiatanId: string;
  kegiatanNama: string;
  waktuAbsen: string;
  lokasi: string;
  foto: string;
  ttd: string;
  verified: boolean;
  verifiedAt: string | null;
  catatan: string | null;
  status: 'HADIR' | 'IZIN';
};

function minutesNow(): number {
  const { hour, minute } = jakartaParts();
  return hour * 60 + minute;
}

function computeWindow(jamMulai: number, jamSelesai: number, now = minutesNow()): KegiatanWindow {
  if (now < jamMulai) return 'BELUM_MULAI';
  if (now < jamSelesai) return 'BUKA';
  return 'TUTUP';
}

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}.${m}`;
}

@Injectable()
export class AbsensiHarianService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Kegiatan CRUD (admin) ──────────────────────────────────────────────

  // Membuatkan baris "Apel Pagi"/"Piket Harian" untuk `tanggal` kalau belum
  // ada — dipanggil di setiap jalur baca kegiatan (listKegiatan, kegiatan
  // untuk guru, rekap admin) supaya keduanya "selalu online" tanpa admin
  // perlu setting manual tiap hari. Dibungkus pg_advisory_xact_lock supaya
  // dua request read-kegiatan yang datang nyaris bersamaan (mis. admin dan
  // guru buka halaman di detik yang sama) tidak sama-sama lolos cek "belum
  // ada" lalu berdua createMany — tanpa lock ini jadi race condition yang
  // bikin baris standing dobel.
  private async ensureStandingKegiatan(tanggal: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tanggal}))`;
      const existing = await tx.kegiatan.findMany({ where: { tanggal }, select: { nama: true } });
      const existingLower = existing.map((e) => e.nama.trim().toLowerCase());
      const missing = STANDING_KEGIATAN.filter((s) => !s.aliases.some((a) => existingLower.includes(a)));
      if (missing.length === 0) return;
      await tx.kegiatan.createMany({
        data: missing.map((s) => ({ nama: s.nama, tanggal, jamMulai: s.jamMulai, jamSelesai: s.jamSelesai })),
      });
    });
  }

  async listKegiatan(tanggal: string): Promise<KegiatanRow[]> {
    await this.ensureStandingKegiatan(tanggal);
    // Diurutkan berdasarkan urutan dibuat (bukan jam mulai) — supaya
    // kegiatan yang admin tambahkan duluan tetap tampil di urutan pertama
    // di kartu "Tambah Kegiatan", walau jam mulainya belakangan diedit jadi
    // lebih pagi dari kegiatan lain.
    const rows = await this.prisma.kegiatan.findMany({
      where: { tanggal },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((k) => ({
      id: k.id,
      nama: k.nama,
      tanggal: k.tanggal,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai,
      keterangan: k.keterangan,
      window: computeWindow(k.jamMulai, k.jamSelesai),
    }));
  }

  private validateJam(jamMulai?: number, jamSelesai?: number) {
    if (jamMulai != null && jamSelesai != null && jamMulai >= jamSelesai) {
      throw new BadRequestException('Jam mulai harus lebih awal dari jam selesai');
    }
  }

  async createKegiatan(
    dto: { nama: string; tanggal: string; jamMulai: number; jamSelesai: number; keterangan?: string },
    adminId: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.tanggal)) throw new BadRequestException('Format tanggal tidak valid');
    this.validateJam(dto.jamMulai, dto.jamSelesai);
    return this.prisma.kegiatan.create({
      data: {
        nama: dto.nama.trim(),
        tanggal: dto.tanggal,
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        keterangan: dto.keterangan?.trim() || null,
        createdById: adminId,
      },
    });
  }

  async updateKegiatan(
    id: string,
    dto: { nama?: string; tanggal?: string; jamMulai?: number; jamSelesai?: number; keterangan?: string },
  ) {
    const existing = await this.prisma.kegiatan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kegiatan tidak ditemukan');
    if (dto.tanggal !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dto.tanggal)) {
      throw new BadRequestException('Format tanggal tidak valid');
    }
    this.validateJam(dto.jamMulai ?? existing.jamMulai, dto.jamSelesai ?? existing.jamSelesai);
    return this.prisma.kegiatan.update({
      where: { id },
      data: {
        nama: dto.nama?.trim(),
        tanggal: dto.tanggal,
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        keterangan: dto.keterangan !== undefined ? (dto.keterangan.trim() || null) : undefined,
      },
    });
  }

  async deleteKegiatan(id: string) {
    const existing = await this.prisma.kegiatan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kegiatan tidak ditemukan');
    await this.prisma.kegiatan.delete({ where: { id } });
    return { message: `Kegiatan "${existing.nama}" dihapus` };
  }

  // ── Guru: lihat kegiatan hari ini + status absensi sendiri ─────────────

  // null = hari ini tidak berjadwal piket (Sabtu/Minggu) → tidak ada aturan
  // piket-vs-apel. Kalau berjadwal tapi guru ybs tidak ada di jadwal hari
  // itu, tetap return { lokasiTugas: null } (bukan null) supaya pemanggil
  // bisa membedakan "tidak berlaku" dari "berlaku, tapi bukan piket".
  private async getPiketAssignment(guruId: string, tanggal: string): Promise<{ lokasiTugas: string } | null> {
    const hari = hariFor(tanggal);
    if (!HARI_BERJADWAL_PIKET.includes(hari)) return null;
    const row = await this.prisma.jadwalPiket.findUnique({ where: { hari_guruId: { hari, guruId } } });
    return { lokasiTugas: row?.lokasiTugas ?? '' };
  }

  // Dipakai rekap mingguan/bulanan (export) untuk menghitung "total kegiatan"
  // yang benar per guru: kegiatan biasa (Upacara, Rapat, dst) berlaku buat
  // semua orang, tapi dari pasangan Apel Pagi/Piket Harian cuma SATU yang
  // relevan per hari per guru (sesuai JadwalPiket-nya) — tanpa ini, seminggu
  // penuh akan salah dihitung 10 kegiatan (5 apel + 5 piket) padahal
  // seharusnya cuma 5 (mis. 4 apel + 1 piket sesuai jadwalnya).
  private async buildRelevantKegiatanMap(
    kegiatanList: { id: string; nama: string; tanggal: string }[],
    guruIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const byTanggal = new Map<string, { id: string; nama: string; tanggal: string }[]>();
    for (const k of kegiatanList) {
      const arr = byTanggal.get(k.tanggal) ?? [];
      arr.push(k);
      byTanggal.set(k.tanggal, arr);
    }

    const hariSet = new Set<string>();
    for (const tgl of byTanggal.keys()) {
      const hari = hariFor(tgl);
      if (HARI_BERJADWAL_PIKET.includes(hari)) hariSet.add(hari);
    }
    const piketRows = hariSet.size > 0 && guruIds.length > 0
      ? await this.prisma.jadwalPiket.findMany({ where: { hari: { in: [...hariSet] }, guruId: { in: guruIds } } })
      : [];
    const piketSet = new Set(piketRows.map((p) => `${p.hari}:${p.guruId}`));

    const result = new Map<string, Set<string>>();
    for (const guruId of guruIds) {
      const relevant = new Set<string>();
      for (const [tgl, list] of byTanggal) {
        const others = list.filter((k) => !isApelKegiatan(k.nama) && !isPiketKegiatan(k.nama));
        others.forEach((k) => relevant.add(k.id));

        const hari = hariFor(tgl);
        if (HARI_BERJADWAL_PIKET.includes(hari)) {
          const isPiketHari = piketSet.has(`${hari}:${guruId}`);
          list
            .filter((k) => (isPiketHari ? isPiketKegiatan(k.nama) : isApelKegiatan(k.nama)))
            .forEach((k) => relevant.add(k.id));
        } else {
          // Sabtu/Minggu tidak seharusnya muncul di tanggalList (sudah
          // difilter effectiveWeekdaysInRange) — fallback aman: hitung apa
          // adanya kalau suatu saat ada baris kegiatan di hari itu juga.
          list.forEach((k) => relevant.add(k.id));
        }
      }
      result.set(guruId, relevant);
    }
    return result;
  }

  async getKegiatanUntukGuru(userId: string, tanggal: string) {
    await this.ensureStandingKegiatan(tanggal);
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    // Sama seperti listKegiatan (kartu admin) — urut berdasarkan kapan
    // dibuat, bukan jam mulai, supaya urutannya konsisten dengan yang
    // admin lihat.
    let kegiatanList = await this.prisma.kegiatan.findMany({
      where: { tanggal },
      orderBy: { createdAt: 'asc' },
    });

    // Aturan piket-vs-apel (dari Jadwal_Piket_Tendik_2026-2027.xlsx): guru
    // yang piket hari itu cuma bisa absen "Piket Harian" (dengan keterangan
    // lokasi tugas personalnya), guru yang tidak piket cuma bisa absen
    // "Apel Pagi". Kegiatan lain (Upacara, Rapat, dst) tidak kena aturan
    // ini. Kalau hari itu tidak berjadwal piket (Sabtu/Minggu), tidak ada
    // pembatasan sama sekali.
    if (guru) {
      const piket = await this.getPiketAssignment(guru.id, tanggal);
      if (piket) {
        if (piket.lokasiTugas) {
          kegiatanList = kegiatanList
            .filter((k) => !isApelKegiatan(k.nama))
            .map((k) => (isPiketKegiatan(k.nama) ? { ...k, keterangan: `Piket di ${piket.lokasiTugas}` } : k));
        } else {
          kegiatanList = kegiatanList.filter((k) => !isPiketKegiatan(k.nama));
        }
      }
    }

    const submitted = guru
      ? await this.prisma.absensiKegiatan.findMany({
          where: { guruId: guru.id, kegiatanId: { in: kegiatanList.map((k) => k.id) } },
          select: { kegiatanId: true, waktuAbsen: true, catatan: true, status: true },
        })
      : [];
    const submittedMap = new Map(submitted.map((s) => [s.kegiatanId, s]));

    return kegiatanList.map((k) => {
      const sub = submittedMap.get(k.id);
      return {
        id: k.id,
        nama: k.nama,
        tanggal: k.tanggal,
        jamMulai: k.jamMulai,
        jamSelesai: k.jamSelesai,
        jamLabel: `${minutesLabel(k.jamMulai)}-${minutesLabel(k.jamSelesai)} WIB`,
        keterangan: k.keterangan,
        window: computeWindow(k.jamMulai, k.jamSelesai),
        sudahAbsen: !!sub,
        waktuAbsen: sub?.waktuAbsen ?? null,
        catatan: sub?.catatan ?? null,
        status: sub?.status ?? null,
      };
    });
  }

  async getStatusSaya(userId: string, tanggal?: string) {
    const tgl = tanggal || todayStr();
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return { tanggal: tgl, kegiatan: [] };
    const kegiatan = await this.getKegiatanUntukGuru(userId, tgl);
    return { tanggal: tgl, kegiatan };
  }

  // ── Guru: submit absensi untuk 1 kegiatan ───────────────────────────────

  async absenKegiatan(
    userId: string,
    kegiatanId: string,
    extras: { lokasi: string; ttd: string; fotoUrl?: string; status?: 'HADIR' | 'IZIN' },
  ) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) throw new NotFoundException('Profil guru tidak ditemukan');

    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: kegiatanId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');
    if (kegiatan.tanggal !== todayStr()) {
      throw new ForbiddenException('Kegiatan ini bukan untuk hari ini');
    }

    // Tegakkan aturan piket-vs-apel di server juga (bukan cuma menyaring
    // daftar di getKegiatanUntukGuru) supaya tidak bisa dilewati dengan
    // memanggil endpoint ini langsung dengan kegiatanId yang seharusnya
    // tidak tersedia untuk guru ybs hari itu.
    const piket = await this.getPiketAssignment(guru.id, kegiatan.tanggal);
    if (piket) {
      if (piket.lokasiTugas && isApelKegiatan(kegiatan.nama)) {
        throw new ForbiddenException('Anda terjadwal piket hari ini — absen "Piket Harian", bukan "Apel Pagi"');
      }
      if (!piket.lokasiTugas && isPiketKegiatan(kegiatan.nama)) {
        throw new ForbiddenException('Anda tidak terjadwal piket hari ini — absen "Apel Pagi"');
      }
    }

    const window = computeWindow(kegiatan.jamMulai, kegiatan.jamSelesai);
    if (window === 'BELUM_MULAI') {
      throw new ForbiddenException(`Kegiatan "${kegiatan.nama}" belum dibuka. Absen dibuka jam ${minutesLabel(kegiatan.jamMulai)} WIB`);
    }
    if (window === 'TUTUP') {
      throw new ForbiddenException(`Waktu absen untuk kegiatan "${kegiatan.nama}" sudah berakhir (jendela ${minutesLabel(kegiatan.jamMulai)}-${minutesLabel(kegiatan.jamSelesai)} WIB)`);
    }

    const existing = await this.prisma.absensiKegiatan.findUnique({
      where: { guruId_kegiatanId: { guruId: guru.id, kegiatanId } },
    });
    if (existing) throw new BadRequestException(`Anda sudah absen untuk kegiatan "${kegiatan.nama}"`);

    if (!extras.fotoUrl) throw new BadRequestException('Foto selfie wajib diisi');
    if (!isValidGpsLokasi(extras.lokasi)) throw new BadRequestException('Lokasi (GPS) wajib diisi dan harus berupa koordinat valid');
    if (!extras.ttd) throw new BadRequestException('Tanda tangan wajib diisi');

    const { hour, minute } = jakartaParts();
    const waktuAbsen = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    return this.prisma.absensiKegiatan.create({
      data: {
        guruId: guru.id,
        kegiatanId,
        waktuAbsen,
        lokasi: extras.lokasi,
        foto: extras.fotoUrl,
        ttd: extras.ttd,
        status: extras.status ?? 'HADIR',
      },
    });
  }

  // ── Admin: rekap 1 tanggal ───────────────────────────────────────────────

  async getRekapKegiatan(tanggal: string) {
    await this.ensureStandingKegiatan(tanggal);
    const kegiatanList = await this.prisma.kegiatan.findMany({
      where: { tanggal },
      orderBy: { jamMulai: 'asc' },
    });
    const absensi = await this.prisma.absensiKegiatan.findMany({
      where: { kegiatanId: { in: kegiatanList.map((k) => k.id) } },
      include: { guru: { include: { user: { select: { nama: true, fotoProfil: true, loginId: true } } } } },
      orderBy: { waktuAbsen: 'asc' },
    });

    const guruTotal = await this.prisma.guru.count();
    const kegiatan = kegiatanList.map((k) => {
      const hadir = absensi.filter((a) => a.kegiatanId === k.id);
      return {
        id: k.id,
        nama: k.nama,
        jamMulai: k.jamMulai,
        jamSelesai: k.jamSelesai,
        jamLabel: `${minutesLabel(k.jamMulai)}-${minutesLabel(k.jamSelesai)} WIB`,
        keterangan: k.keterangan,
        window: computeWindow(k.jamMulai, k.jamSelesai),
        jumlahAbsen: hadir.length,
        guruTotal,
      };
    });

    const rows: AbsensiKegiatanRow[] = absensi.map((a) => ({
      id: a.id,
      guruId: a.guruId,
      nama: a.guru.user?.nama ?? null,
      nip: a.guru.nip,
      npy: a.guru.user?.loginId ?? null,
      fotoProfil: a.guru.user?.fotoProfil ?? null,
      kegiatanId: a.kegiatanId,
      kegiatanNama: kegiatanList.find((k) => k.id === a.kegiatanId)?.nama ?? '-',
      waktuAbsen: a.waktuAbsen,
      lokasi: a.lokasi,
      foto: a.foto,
      ttd: a.ttd,
      verified: a.verified,
      verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
      catatan: a.catatan,
      status: a.status,
    }));

    return { tanggal, kegiatan, rows };
  }

  // ── Admin: verifikasi absensi ────────────────────────────────────────────

  // Toggle, bukan set-only — admin bisa membatalkan verifikasi kalau salah
  // klik. verifiedAt/verifiedById dikosongkan lagi saat dibatalkan supaya
  // konsisten dengan verified=false (bukan menyisakan jejak verifikasi lama).
  async toggleVerifikasi(id: string, adminUserId: string, catatan?: string) {
    const row = await this.prisma.absensiKegiatan.findUnique({
      where: { id },
      include: { guru: true, kegiatan: { select: { nama: true } } },
    });
    if (!row) throw new NotFoundException('Data absensi tidak ditemukan');

    const verified = !row.verified;
    const trimmedCatatan = verified ? (catatan?.trim() || null) : null;

    const updated = await this.prisma.absensiKegiatan.update({
      where: { id },
      data: {
        verified,
        verifiedAt: verified ? new Date() : null,
        verifiedById: verified ? adminUserId : null,
        catatan: trimmedCatatan,
      },
    });

    // Catatan dari ketenagaan itu informasi baru buat guru ybs — kirim
    // notifikasi hanya kalau memang ada isinya (bukan tiap kali verifikasi
    // polos tanpa catatan).
    if (verified && trimmedCatatan) {
      await this.notificationService.create({
        userId: row.guru.userId,
        title: 'Catatan dari Ketenagaan',
        message: `Absensi "${row.kegiatan.nama}" Anda diverifikasi dengan catatan: ${trimmedCatatan}`,
        type: NotificationType.ABSENSI,
        link: '/guru/absensi-harian',
      });
    }

    return {
      message: verified ? 'Absensi berhasil diverifikasi' : 'Verifikasi dibatalkan',
      verified: updated.verified,
      verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : null,
      catatan: updated.catatan,
    };
  }

  // Hapus 1 baris absensi kegiatan (koreksi data oleh admin/superadmin) —
  // guru yang bersangkutan jadi kembali berstatus belum absen untuk
  // kegiatan itu dan bisa mengisi ulang selama jendela waktunya masih buka.
  async deleteAbsensi(id: string) {
    const row = await this.prisma.absensiKegiatan.findUnique({
      where: { id },
      include: { guru: { select: { user: { select: { nama: true } } } }, kegiatan: { select: { nama: true } } },
    });
    if (!row) throw new NotFoundException('Data absensi tidak ditemukan');
    await this.prisma.absensiKegiatan.delete({ where: { id } });
    return { message: `Absensi "${row.guru.user.nama}" untuk kegiatan "${row.kegiatan.nama}" dihapus` };
  }

  // ── Reminder ─────────────────────────────────────────────────────────────

  async kirimPengingatBelumAbsen(kegiatanId: string) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: kegiatanId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const guruList = await this.prisma.guru.findMany({ select: { id: true, userId: true } });
    const submitted = await this.prisma.absensiKegiatan.findMany({
      where: { kegiatanId },
      select: { guruId: true },
    });
    const submittedSet = new Set(submitted.map((s) => s.guruId));
    const belumAbsenUserIds = guruList.filter((g) => !submittedSet.has(g.id)).map((g) => g.userId);

    if (belumAbsenUserIds.length === 0) return { count: 0 };

    await this.notificationService.createMany(belumAbsenUserIds, {
      title: 'Pengingat Absen Kegiatan',
      message: `Anda belum absen untuk kegiatan "${kegiatan.nama}". Segera lakukan presensi.`,
      type: NotificationType.ABSENSI,
      link: '/guru/absensi-harian',
    });

    return { count: belumAbsenUserIds.length };
  }

  // ── Laporan rendah kehadiran ─────────────────────────────────────────────

  async getLaporanRendahKehadiran(periode: 'mingguan' | 'bulanan') {
    const end = todayStr();
    const start = addDaysUTC(end, periode === 'bulanan' ? -29 : -6);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    const kegiatanList = tanggalList.length > 0
      ? await this.prisma.kegiatan.findMany({ where: { tanggal: { in: tanggalList } } })
      : [];
    const totalKegiatan = kegiatanList.length;

    const guruList = await this.prisma.guru.findMany({
      include: { user: { select: { nama: true, fotoProfil: true } } },
      orderBy: { user: { nama: 'asc' } },
    });

    const absensi = totalKegiatan > 0
      ? await this.prisma.absensiKegiatan.findMany({
          where: { kegiatanId: { in: kegiatanList.map((k) => k.id) } },
          select: { guruId: true },
        })
      : [];
    const countByGuru = new Map<string, number>();
    for (const a of absensi) countByGuru.set(a.guruId, (countByGuru.get(a.guruId) ?? 0) + 1);

    const guru = guruList
      .map((g) => {
        const hadir = countByGuru.get(g.id) ?? 0;
        const tidakHadir = totalKegiatan - hadir;
        const persentaseKehadiran = totalKegiatan > 0 ? Math.round((hadir / totalKegiatan) * 1000) / 10 : 0;
        return {
          guruId: g.id,
          nama: g.user?.nama ?? null,
          nip: g.nip,
          fotoProfil: g.user?.fotoProfil ?? null,
          summary: { hadir, totalKegiatan, tidakHadir, persentaseKehadiran },
        };
      })
      .filter((r) => r.summary.tidakHadir > 0)
      .sort((a, b) => b.summary.tidakHadir - a.summary.tidakHadir || a.summary.persentaseKehadiran - b.summary.persentaseKehadiran);

    return { periode, tanggalMulai: start, tanggalSelesai: end, totalKegiatan, guru };
  }

  // ── Export helpers ───────────────────────────────────────────────────────

  async getRekapForExport(tanggal: string) {
    return this.getRekapKegiatan(tanggal);
  }

  async getGuruAbsensiForExport(guruId: string, tanggal: string) {
    const guru = await this.assertGuruExists(guruId);
    const kegiatanList = await this.prisma.kegiatan.findMany({ where: { tanggal }, orderBy: { jamMulai: 'asc' } });
    const absensi = await this.prisma.absensiKegiatan.findMany({
      where: { guruId, kegiatanId: { in: kegiatanList.map((k) => k.id) } },
    });
    const absMap = new Map(absensi.map((a) => [a.kegiatanId, a]));

    const rows: AbsensiKegiatanRow[] = kegiatanList
      .filter((k) => absMap.has(k.id))
      .map((k) => {
        const a = absMap.get(k.id)!;
        return {
          id: a.id,
          guruId,
          nama: guru.user?.nama ?? null,
          nip: guru.nip,
          npy: guru.user?.loginId ?? null,
          fotoProfil: guru.user?.fotoProfil ?? null,
          kegiatanId: k.id,
          kegiatanNama: k.nama,
          waktuAbsen: a.waktuAbsen,
          lokasi: a.lokasi,
          foto: a.foto,
          ttd: a.ttd,
          verified: a.verified,
          verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
          catatan: a.catatan,
          status: a.status,
        };
      });

    return { tanggal, guruNama: guru.user?.nama ?? null, rows };
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

  async getRekapRangeForExport(
    mode: 'mingguan' | 'bulanan',
    opts: { tanggalMulai?: string; tanggalSelesai?: string; bulan?: string; tahun?: string },
  ) {
    const { start, end } = this.resolveRange(mode, opts.tanggalMulai, opts.tanggalSelesai, opts.bulan, opts.tahun);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    // Pastikan Apel Pagi/Piket Harian sudah ada untuk tiap tanggal di
    // rentang ini sebelum dihitung — tanpa ini, tanggal lampau yang belum
    // pernah dibuka siapa pun bisa kehilangan baris standing-nya dan bikin
    // total kegiatan under-count.
    if (tanggalList.length > 0) {
      await Promise.all(tanggalList.map((tgl) => this.ensureStandingKegiatan(tgl)));
    }

    const kegiatanList = tanggalList.length > 0
      ? await this.prisma.kegiatan.findMany({ where: { tanggal: { in: tanggalList } } })
      : [];
    const guruList = await this.prisma.guru.findMany({
      include: { user: { select: { nama: true, loginId: true } } },
      orderBy: { user: { nama: 'asc' } },
    });
    const absensi = kegiatanList.length > 0
      ? await this.prisma.absensiKegiatan.findMany({ where: { kegiatanId: { in: kegiatanList.map((k) => k.id) } } })
      : [];

    const relevantMap = await this.buildRelevantKegiatanMap(kegiatanList, guruList.map((g) => g.id));

    const guru = guruList.map((g) => {
      const relevant = relevantMap.get(g.id) ?? new Set<string>();
      const hadir = absensi.filter((a) => a.guruId === g.id && relevant.has(a.kegiatanId)).length;
      const totalKegiatan = relevant.size;
      return {
        guruId: g.id,
        nama: g.user?.nama ?? null,
        nip: g.nip,
        npy: g.user?.loginId ?? null,
        hadir,
        totalKegiatan,
        persentaseKehadiran: totalKegiatan > 0 ? Math.round((hadir / totalKegiatan) * 1000) / 10 : 0,
      };
    });

    // Kegiatan "biasa" (non-apel/piket) berlaku sama buat semua guru, dan
    // dari pasangan apel/piket tiap hari kerja selalu tepat 1 yang relevan
    // per guru — jadi totalKegiatan per guru itu konstan sepanjang periode
    // ini, dipakai sebagai angka ringkasan laporan (bukan rata-rata).
    const totalKegiatanPerGuru = guru[0]?.totalKegiatan
      ?? kegiatanList.filter((k) => !isApelKegiatan(k.nama) && !isPiketKegiatan(k.nama)).length + tanggalList.length;
    const totalHadirKeseluruhan = guru.reduce((sum, g) => sum + g.hadir, 0);
    const totalKegiatanKeseluruhan = guru.reduce((sum, g) => sum + g.totalKegiatan, 0);
    const persentaseKeseluruhan = totalKegiatanKeseluruhan > 0
      ? Math.round((totalHadirKeseluruhan / totalKegiatanKeseluruhan) * 1000) / 10
      : 0;

    return {
      mode,
      tanggalMulai: start,
      tanggalSelesai: end,
      totalKegiatan: totalKegiatanPerGuru,
      totalHadirKeseluruhan,
      totalKegiatanKeseluruhan,
      persentaseKeseluruhan,
      guru,
    };
  }

  async getGuruAbsensiRangeForExport(
    guruId: string,
    mode: 'mingguan' | 'bulanan',
    opts: { tanggalMulai?: string; tanggalSelesai?: string; bulan?: string; tahun?: string },
  ) {
    const guru = await this.assertGuruExists(guruId);
    const { start, end } = this.resolveRange(mode, opts.tanggalMulai, opts.tanggalSelesai, opts.bulan, opts.tahun);
    const tanggalList = effectiveWeekdaysInRange(start, end);

    if (tanggalList.length > 0) {
      await Promise.all(tanggalList.map((tgl) => this.ensureStandingKegiatan(tgl)));
    }

    const kegiatanListAll = tanggalList.length > 0
      ? await this.prisma.kegiatan.findMany({ where: { tanggal: { in: tanggalList } }, orderBy: [{ tanggal: 'asc' }, { jamMulai: 'asc' }] })
      : [];
    // Cuma satu dari Apel Pagi/Piket Harian per hari yang relevan buat guru
    // ini (sesuai JadwalPiket-nya) — yang tidak relevan disingkirkan dari
    // daftar supaya tidak muncul sebagai "Tidak Hadir" yang menyesatkan.
    const relevantMap = await this.buildRelevantKegiatanMap(kegiatanListAll, [guruId]);
    const relevant = relevantMap.get(guruId) ?? new Set<string>();
    const kegiatanList = kegiatanListAll.filter((k) => relevant.has(k.id));

    const absensi = kegiatanList.length > 0
      ? await this.prisma.absensiKegiatan.findMany({ where: { guruId, kegiatanId: { in: kegiatanList.map((k) => k.id) } } })
      : [];
    const absMap = new Map(absensi.map((a) => [a.kegiatanId, a]));

    const rows = kegiatanList.map((k) => ({
      tanggal: k.tanggal,
      kegiatanNama: k.nama,
      hadir: absMap.has(k.id),
      waktuAbsen: absMap.get(k.id)?.waktuAbsen ?? null,
    }));

    const hadir = rows.filter((r) => r.hadir).length;
    return {
      mode,
      tanggalMulai: start,
      tanggalSelesai: end,
      guruNama: guru.user?.nama ?? null,
      rows,
      summary: { hadir, totalKegiatan: kegiatanList.length, persentaseKehadiran: kegiatanList.length > 0 ? Math.round((hadir / kegiatanList.length) * 1000) / 10 : 0 },
    };
  }

  private async assertGuruExists(guruId: string) {
    const guru = await this.prisma.guru.findUnique({
      where: { id: guruId },
      include: { user: { select: { nama: true, fotoProfil: true, loginId: true } } },
    });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    return guru;
  }

  async getTtdImage(absensiId: string) {
    const doc = await this.prisma.absensiKegiatan.findUnique({ where: { id: absensiId } });
    if (!doc?.ttd) return null;
    const match = /^data:image\/(png|jpe?g);base64,([a-zA-Z0-9+/=]+)$/.exec(doc.ttd.trim());
    if (!match) return null;
    return {
      buffer: Buffer.from(match[2], 'base64'),
      mime: `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`,
    };
  }
}
