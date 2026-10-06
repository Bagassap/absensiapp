import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, Role } from '../../generated/prisma/client';
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
  // Terisi kalau baris ini dibuat otomatis dari KegiatanRecurring — dipakai
  // frontend untuk menampilkan catatan "perubahan jam berlaku untuk
  // minggu-minggu berikutnya juga" saat admin mengedit instance ini.
  recurringSourceId: string | null;
};

// "Apel Pagi" dan "Piket Harian" dulunya hardcode (STANDING_KEGIATAN,
// dibuat otomatis 00.00-23.59 tiap tanggal) — sekarang keduanya jadi
// KegiatanRecurring biasa (lihat seed di bawah / dibuat admin lewat UI
// "Kegiatan Berulang"), supaya jamnya bisa diatur sekali untuk seterusnya
// alih-alih diedit manual tiap hari. `aliases` (lower-case) dipertahankan
// untuk aturan piket-vs-apel di bawah, terlepas dari kegiatan itu berasal
// dari recurring atau dibuat manual satu-kali.
const APEL_ALIASES = ['apel pagi', 'apel'];
const PIKET_ALIASES = ['piket harian', 'piket'];
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
  // Cuma terisi untuk kegiatan "Piket Harian" pada guru yang memang
  // berjadwal piket hari itu (lokasi tugasnya) — dipakai sebagai label
  // pembeda di tabel admin, terutama saat filter "Semua" kegiatan digabung.
  keterangan: string | null;
  waktuAbsen: string;
  lokasi: string;
  foto: string;
  ttd: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedByNama: string | null;
  catatan: string | null;
  // 'ALFA' hanya dipakai untuk baris sintetis (guru yang belum absen sama
  // sekali untuk kegiatan tsb) di getRekapKegiatan — bukan status yang
  // pernah tersimpan di kolom `status` tabel absensi_kegiatan itu sendiri
  // (kolomnya di DB cuma HADIR/IZIN, lihat StatusAbsensiKegiatan enum).
  status: 'HADIR' | 'IZIN' | 'ALFA';
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

  async listKegiatan(tanggal: string): Promise<KegiatanRow[]> {
    await this.ensureRecurringKegiatan(tanggal);
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
      recurringSourceId: k.recurringSourceId,
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

    const updated = await this.prisma.kegiatan.update({
      where: { id },
      data: {
        nama: dto.nama?.trim(),
        tanggal: dto.tanggal,
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        keterangan: dto.keterangan !== undefined ? (dto.keterangan.trim() || null) : undefined,
      },
    });

    // Instance ini berasal dari kegiatan berulang — nama/jam/keterangan
    // ikut disinkronkan ke aturannya supaya berlaku "untuk seterusnya"
    // (semua instance yang akan dibuat ke depan), bukan cuma tanggal ini
    // saja. `tanggal` sengaja tidak disinkronkan (aturan berulang berbasis
    // hari, bukan tanggal spesifik), dan instance-instance minggu
    // sebelumnya yang sudah pernah dibuat juga tidak diubah retroaktif.
    if (existing.recurringSourceId && (dto.nama !== undefined || dto.jamMulai !== undefined || dto.jamSelesai !== undefined || dto.keterangan !== undefined)) {
      await this.prisma.kegiatanRecurring.update({
        where: { id: existing.recurringSourceId },
        data: {
          nama: dto.nama?.trim(),
          jamMulai: dto.jamMulai,
          jamSelesai: dto.jamSelesai,
          keterangan: dto.keterangan !== undefined ? (dto.keterangan.trim() || null) : undefined,
        },
      }).catch(() => {});
    }

    return updated;
  }

  async deleteKegiatan(id: string) {
    const existing = await this.prisma.kegiatan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kegiatan tidak ditemukan');
    await this.prisma.kegiatan.delete({ where: { id } });
    return { message: `Kegiatan "${existing.nama}" dihapus` };
  }

  // ── Kegiatan berulang mingguan (admin) ──────────────────────────────────

  async listKegiatanRecurring() {
    return this.prisma.kegiatanRecurring.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createKegiatanRecurring(
    dto: { nama: string; hari: string[]; jamMulai: number; jamSelesai: number; keterangan?: string },
    adminId: string,
  ) {
    this.validateJam(dto.jamMulai, dto.jamSelesai);
    return this.prisma.kegiatanRecurring.create({
      data: {
        nama: dto.nama.trim(),
        hari: dto.hari,
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        keterangan: dto.keterangan?.trim() || null,
        createdById: adminId,
      },
    });
  }

  async updateKegiatanRecurring(
    id: string,
    dto: { nama?: string; hari?: string[]; jamMulai?: number; jamSelesai?: number; keterangan?: string },
  ) {
    const existing = await this.prisma.kegiatanRecurring.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kegiatan berulang tidak ditemukan');
    this.validateJam(dto.jamMulai ?? existing.jamMulai, dto.jamSelesai ?? existing.jamSelesai);
    const updated = await this.prisma.kegiatanRecurring.update({
      where: { id },
      data: {
        nama: dto.nama?.trim(),
        hari: dto.hari,
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        keterangan: dto.keterangan !== undefined ? (dto.keterangan.trim() || null) : undefined,
      },
    });

    // Sinkronkan ke instance yang SUDAH dibuat dari aturan ini untuk hari
    // ini/ke depan — tanpa ini, instance hari ini (sudah tergenerate lebih
    // dulu saat halaman dibuka pagi ini, sebelum aturan diedit siang ini)
    // tetap memakai nilai lama, jadi guru tidak pernah melihat perubahan
    // yang admin kira sudah langsung berlaku. Instance tanggal LAMPAU
    // sengaja tidak disentuh (riwayat kehadiran tidak diubah retroaktif).
    await this.prisma.kegiatan.updateMany({
      where: { recurringSourceId: id, tanggal: { gte: todayStr() } },
      data: {
        nama: dto.nama?.trim(),
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        keterangan: dto.keterangan !== undefined ? (dto.keterangan.trim() || null) : undefined,
      },
    });

    return updated;
  }

  // Cuma menghapus ATURANNYA (berhenti membuat instance baru ke depan) —
  // instance Kegiatan yang sudah pernah dibuat dari aturan ini (termasuk
  // riwayat absensinya) TIDAK ikut terhapus (recurringSourceId di-SetNull
  // oleh FK, lihat migration), supaya riwayat kehadiran tetap utuh.
  async deleteKegiatanRecurring(id: string) {
    const existing = await this.prisma.kegiatanRecurring.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kegiatan berulang tidak ditemukan');
    await this.prisma.kegiatanRecurring.delete({ where: { id } });
    return { message: `Kegiatan berulang "${existing.nama}" dihapus. Kegiatan yang sudah pernah dibuat dari aturan ini tetap ada.` };
  }

  // Membuatkan instance Kegiatan untuk tiap aturan KegiatanRecurring yang
  // mencakup hari ini (termasuk "Apel Pagi"/"Piket Harian", yang sekarang
  // juga cuma aturan KegiatanRecurring biasa — lihat seed di
  // scripts/seed-kegiatan-recurring.ts) — dipanggil di setiap jalur baca
  // kegiatan (listKegiatan, kegiatan untuk guru, rekap admin, export).
  // Dibungkus pg_advisory_xact_lock per tanggal supaya 2 request nyaris
  // bersamaan tidak sama-sama lolos cek "belum ada" lalu berdua createMany.
  private async ensureRecurringKegiatan(tanggal: string) {
    const hari = hariFor(tanggal);
    const rules = await this.prisma.kegiatanRecurring.findMany({ where: { hari: { has: hari } } });
    if (rules.length === 0) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'recurring-' + tanggal}))`;
      const existing = await tx.kegiatan.findMany({
        where: { tanggal, recurringSourceId: { in: rules.map((r) => r.id) } },
        select: { recurringSourceId: true },
      });
      const existingIds = new Set(existing.map((e) => e.recurringSourceId));
      const missing = rules.filter((r) => !existingIds.has(r.id));
      if (missing.length === 0) return;
      await tx.kegiatan.createMany({
        data: missing.map((r) => ({
          nama: r.nama,
          tanggal,
          jamMulai: r.jamMulai,
          jamSelesai: r.jamSelesai,
          keterangan: r.keterangan,
          createdById: r.createdById,
          recurringSourceId: r.id,
        })),
      });
    });
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
    await this.ensureRecurringKegiatan(tanggal);
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
          select: { kegiatanId: true, waktuAbsen: true, catatan: true, status: true, foto: true, lokasi: true, ttd: true },
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
        // Bukti absen milik guru sendiri (dipakai modal detail di menu
        // mobile) — aman ditampilkan ke diri sendiri, beda dengan data
        // guru lain yang hanya boleh dilihat admin.
        foto: sub?.foto ?? null,
        lokasi: sub?.lokasi ?? null,
        ttd: sub?.ttd ?? null,
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
    await this.ensureRecurringKegiatan(tanggal);
    const kegiatanList = await this.prisma.kegiatan.findMany({
      where: { tanggal },
      orderBy: { jamMulai: 'asc' },
    });
    const absensi = await this.prisma.absensiKegiatan.findMany({
      where: { kegiatanId: { in: kegiatanList.map((k) => k.id) } },
      include: {
        guru: { include: { user: { select: { nama: true, fotoProfil: true, loginId: true } } } },
        verifiedBy: { select: { nama: true } },
      },
      orderBy: { waktuAbsen: 'asc' },
    });

    // Peta guruId -> lokasiTugas piket hari ini (kalau hari ini berjadwal
    // piket) — dipakai untuk (a) tidak menampilkan Apel Pagi DAN Piket
    // Harian sekaligus untuk guru yang sama (guru piket cuma "hadir" lewat
    // Piket Harian, guru non-piket cuma lewat Apel Pagi) dan (b) mengisi
    // `keterangan` piket. Sama seperti aturan di getKegiatanUntukGuru, kalau
    // hari ini tidak berjadwal piket (Sabtu/Minggu) tidak ada pengecualian
    // sama sekali — peta dibiarkan kosong.
    const hari = hariFor(tanggal);
    const piketMap = new Map<string, string>();
    if (HARI_BERJADWAL_PIKET.includes(hari)) {
      const jadwalHariIni = await this.prisma.jadwalPiket.findMany({ where: { hari } });
      for (const j of jadwalHariIni) piketMap.set(j.guruId, j.lokasiTugas);
    }
    const keteranganFor = (guruId: string, kegiatanNama: string): string | null =>
      isPiketKegiatan(kegiatanNama) && piketMap.has(guruId) ? `Piket di ${piketMap.get(guruId)}` : null;

    // Jumlah guru aktif — dipakai sebagai basis "guruTotal" per kegiatan di
    // bawah (hanya guru aktif, konsisten dengan baris Alfa sintetis yang
    // juga cuma dibuat untuk guru aktif, lihat `guruAktif` di bawah).
    const totalGuruAktif = await this.prisma.guru.count({ where: { user: { isActive: true } } });
    // "guruTotal" per kegiatan HARUS mengikuti aturan piket-vs-apel yang
    // sama dengan baris Alfa di bawah — kalau tidak, badge "X/Y guru absen"
    // dan panel "Belum Absen" di admin akan selalu memakai Y = SEMUA guru
    // (mis. 78), padahal Piket Harian cuma relevan buat guru yang memang
    // berjadwal piket hari itu (biasanya belasan orang saja, bukan semua).
    const guruTotalFor = (kegiatanNama: string): number => {
      if (!HARI_BERJADWAL_PIKET.includes(hari)) return totalGuruAktif;
      if (isPiketKegiatan(kegiatanNama)) return piketMap.size;
      if (isApelKegiatan(kegiatanNama)) return totalGuruAktif - piketMap.size;
      return totalGuruAktif;
    };

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
        guruTotal: guruTotalFor(k.nama),
      };
    });

    const rows: AbsensiKegiatanRow[] = absensi.map((a) => {
      const kNama = kegiatanList.find((k) => k.id === a.kegiatanId)?.nama ?? '-';
      return {
        id: a.id,
        guruId: a.guruId,
        nama: a.guru.user?.nama ?? null,
        nip: a.guru.nip,
        npy: a.guru.user?.loginId ?? null,
        fotoProfil: a.guru.user?.fotoProfil ?? null,
        kegiatanId: a.kegiatanId,
        kegiatanNama: kNama,
        keterangan: keteranganFor(a.guruId, kNama),
        waktuAbsen: a.waktuAbsen,
        lokasi: a.lokasi,
        foto: a.foto,
        ttd: a.ttd,
        verified: a.verified,
        verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
        verifiedByNama: a.verifiedBy?.nama ?? null,
        catatan: a.catatan,
        status: a.status,
      };
    });

    // Baris "Alfa" sintetis — supaya tabel menampilkan SEMUA guru per
    // kegiatan (bukan cuma yang sudah absen), bukan dari tabel
    // absensi_kegiatan (guru ybs memang belum pernah submit untuk kegiatan
    // ini). id-nya dibuat dengan prefix "alfa-" (bukan cuid asli) supaya
    // gampang dibedakan dan tidak bisa disalahartikan sebagai id record
    // sungguhan (mis. dikirim ke endpoint hapus/verifikasi).
    const guruAktif = await this.prisma.guru.findMany({
      where: { user: { isActive: true } },
      include: { user: { select: { nama: true, fotoProfil: true, loginId: true } } },
    });
    for (const k of kegiatanList) {
      const sudahAbsenIds = new Set(absensi.filter((a) => a.kegiatanId === k.id).map((a) => a.guruId));
      for (const g of guruAktif) {
        if (sudahAbsenIds.has(g.id)) continue;
        // Aturan piket-vs-apel — guru piket cuma relevan di "Piket Harian",
        // guru non-piket cuma relevan di "Apel Pagi", supaya guru yang sama
        // tidak muncul dobel (Alfa di Apel Pagi SEKALIGUS Alfa di Piket
        // Harian) waktu filter "Semua" kegiatan digabung jadi satu tabel.
        if (HARI_BERJADWAL_PIKET.includes(hari)) {
          const isPiketGuru = piketMap.has(g.id);
          if (isApelKegiatan(k.nama) && isPiketGuru) continue;
          if (isPiketKegiatan(k.nama) && !isPiketGuru) continue;
        }
        rows.push({
          id: `alfa-${k.id}-${g.id}`,
          guruId: g.id,
          nama: g.user?.nama ?? null,
          nip: g.nip,
          npy: g.user?.loginId ?? null,
          fotoProfil: g.user?.fotoProfil ?? null,
          kegiatanId: k.id,
          kegiatanNama: k.nama,
          keterangan: keteranganFor(g.id, k.nama),
          waktuAbsen: '-',
          lokasi: '',
          foto: '',
          ttd: '',
          verified: false,
          verifiedAt: null,
          verifiedByNama: null,
          catatan: null,
          status: 'ALFA',
        });
      }
    }

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

    const guruList = await this.prisma.guru.findMany({ where: { user: { isActive: true } }, select: { id: true, userId: true } });
    // Aturan piket-vs-apel sama seperti getRekapKegiatan — kalau tidak
    // disaring, guru yang tidak berjadwal piket hari ini ikut kena
    // pengingat "belum absen Piket Harian" padahal memang tidak wajib.
    const relevantMap = await this.buildRelevantKegiatanMap(
      [{ id: kegiatan.id, nama: kegiatan.nama, tanggal: kegiatan.tanggal }],
      guruList.map((g) => g.id),
    );
    const submitted = await this.prisma.absensiKegiatan.findMany({
      where: { kegiatanId },
      select: { guruId: true },
    });
    const submittedSet = new Set(submitted.map((s) => s.guruId));
    const belumAbsenUserIds = guruList
      .filter((g) => (relevantMap.get(g.id)?.has(kegiatan.id) ?? false) && !submittedSet.has(g.id))
      .map((g) => g.userId);

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

  // Daftar guru khusus buat dropdown "Pilih Guru" di tombol unduh PDF/Excel
  // per-guru — beda dari UsersService.findGuruList() (dipakai halaman Data
  // Guru) yang cuma role GURU, karena banyak admin di sekolah ini JUGA
  // punya akun Guru (ikut absen Apel Pagi/Piket Harian seperti guru biasa,
  // lihat rekap harian) sehingga perlu bisa diunduh juga. Sengaja dibuat
  // endpoint read-only terpisah (bukan ikut melebarkan findGuruList) supaya
  // akun admin tidak ikut muncul di tabel kelola Data Guru yang punya
  // tombol nonaktifkan — risiko admin tidak sengaja menonaktifkan sesama
  // admin lewat halaman yang tidak didesain untuk itu.
  async getExportGuruRoster() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [Role.GURU, Role.ADMIN] }, guru: { isNot: null } },
      select: { nama: true, loginId: true, fotoProfil: true, guru: { select: { id: true, nip: true } } },
      orderBy: { nama: 'asc' },
    });
    return users
      .filter((u) => u.guru)
      .map((u) => ({ guruId: u.guru!.id, nama: u.nama, nip: u.guru!.nip, npy: u.loginId, fotoProfil: u.fotoProfil }));
  }

  async getRekapForExport(tanggal: string) {
    return this.getRekapKegiatan(tanggal);
  }

  async getGuruAbsensiForExport(guruId: string, tanggal: string) {
    const guru = await this.assertGuruExists(guruId);
    const kegiatanList = await this.prisma.kegiatan.findMany({ where: { tanggal }, orderBy: { jamMulai: 'asc' } });
    const absensi = await this.prisma.absensiKegiatan.findMany({
      where: { guruId, kegiatanId: { in: kegiatanList.map((k) => k.id) } },
      include: { verifiedBy: { select: { nama: true } } },
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
          keterangan: null,
          waktuAbsen: a.waktuAbsen,
          lokasi: a.lokasi,
          foto: a.foto,
          ttd: a.ttd,
          verified: a.verified,
          verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
          verifiedByNama: a.verifiedBy?.nama ?? null,
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

    // Pastikan kegiatan berulang (Apel Pagi/Piket Harian/dst) sudah ada
    // untuk tiap tanggal di rentang ini sebelum dihitung — tanpa ini,
    // tanggal lampau yang belum pernah dibuka siapa pun bisa kehilangan
    // instance-nya dan bikin total kegiatan under-count.
    if (tanggalList.length > 0) {
      await Promise.all(tanggalList.map((tgl) => this.ensureRecurringKegiatan(tgl)));
    }

    const kegiatanList = tanggalList.length > 0
      ? await this.prisma.kegiatan.findMany({ where: { tanggal: { in: tanggalList } } })
      : [];
    const guruList = await this.prisma.guru.findMany({
      include: { user: { select: { nama: true, loginId: true, fotoProfil: true } } },
      orderBy: { user: { nama: 'asc' } },
    });
    const absensi = kegiatanList.length > 0
      ? await this.prisma.absensiKegiatan.findMany({
          where: { kegiatanId: { in: kegiatanList.map((k) => k.id) } },
          include: { verifiedBy: { select: { nama: true } } },
        })
      : [];

    // Baris per-submission (dipakai export PDF landscape — satu baris =
    // satu kali absen, lengkap dengan tanggal, status, foto, catatan) —
    // dibangun dari query yang sama di atas (bukan query baru) supaya tidak
    // dobel round-trip ke DB. Diurutkan tanggal lalu jam supaya terbaca
    // kronologis di laporan. "Alfa" sengaja TIDAK disertakan di sini (beda
    // dari tabel admin harian) — kalau ikut disertakan, laporan rentang
    // panjang (terutama bulanan) bisa membengkak jadi ribuan baris kosong
    // untuk tiap guru×kegiatan yang tidak diikuti, padahal ringkasan
    // persentase di atas sudah mewakili info itu.
    const guruMap = new Map(guruList.map((g) => [g.id, g]));
    const kegiatanMap = new Map(kegiatanList.map((k) => [k.id, k]));
    const rows = absensi
      .map((a) => {
        const g = guruMap.get(a.guruId);
        const k = kegiatanMap.get(a.kegiatanId);
        if (!g || !k) return null;
        return {
          id: a.id,
          guruId: a.guruId,
          nama: g.user?.nama ?? null,
          nip: g.nip,
          npy: g.user?.loginId ?? null,
          fotoProfil: g.user?.fotoProfil ?? null,
          kegiatanNama: k.nama,
          tanggal: k.tanggal,
          waktuAbsen: a.waktuAbsen,
          lokasi: a.lokasi,
          foto: a.foto,
          ttd: a.ttd,
          verified: a.verified,
          verifiedByNama: a.verifiedBy?.nama ?? null,
          catatan: a.catatan,
          status: a.status as 'HADIR' | 'IZIN',
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (a.tanggal === b.tanggal ? a.waktuAbsen.localeCompare(b.waktuAbsen) : a.tanggal.localeCompare(b.tanggal)));

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
      rows,
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
      await Promise.all(tanggalList.map((tgl) => this.ensureRecurringKegiatan(tgl)));
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
      ? await this.prisma.absensiKegiatan.findMany({
          where: { guruId, kegiatanId: { in: kegiatanList.map((k) => k.id) } },
          include: { verifiedBy: { select: { nama: true } } },
        })
      : [];
    const absMap = new Map(absensi.map((a) => [a.kegiatanId, a]));

    const rows = kegiatanList.map((k) => {
      const a = absMap.get(k.id);
      return {
        tanggal: k.tanggal,
        kegiatanNama: k.nama,
        hadir: !!a,
        waktuAbsen: a?.waktuAbsen ?? null,
        lokasi: a?.lokasi ?? '',
        foto: a?.foto ?? '',
        ttd: a?.ttd ?? '',
        verified: a?.verified ?? false,
        verifiedByNama: a?.verifiedBy?.nama ?? null,
        catatan: a?.catatan ?? null,
        status: (a?.status as 'HADIR' | 'IZIN' | undefined) ?? null,
      };
    });

    const hadir = rows.filter((r) => r.hadir).length;
    return {
      mode,
      tanggalMulai: start,
      tanggalSelesai: end,
      guruNama: guru.user?.nama ?? null,
      guruNip: guru.nip,
      guruFotoProfil: guru.user?.fotoProfil ?? null,
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
