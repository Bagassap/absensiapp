import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';
import { CreateTugasDto } from './dto/create-tugas.dto';
import { UpdateTugasDto } from './dto/update-tugas.dto';
import { SubmitTugasDto } from './dto/submit-tugas.dto';
import { SubmitPercobaanDto } from './dto/percobaan-tugas.dto';

type Actor = { id: string; role: string };

interface SoalInput {
  pertanyaan: string;
  pilihanA?: string;
  pilihanB?: string;
  pilihanC?: string;
  pilihanD?: string;
  jawabanBenar?: string;
}

interface JawabanInput {
  soalId: string;
  jawabanPilihan?: string;
  jawabanEssay?: string;
}

const INCLUDE_KELAS = { select: { id: true, nama: true } } as const;
const INCLUDE_CREATED_BY = { select: { id: true, nama: true, role: true } } as const;
const SOAL_ORDER = { orderBy: { urutan: 'asc' as const } };

function parseJsonArray<T>(raw: string | undefined, label: string): T[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException(`Format ${label} tidak valid`);
  }
  if (!Array.isArray(parsed)) throw new BadRequestException(`Format ${label} tidak valid`);
  return parsed as T[];
}

const NEEDS_SOAL = new Set(['PILIHAN_GANDA', 'ESSAY']);
const LOCKDOWN_TIPE = new Set(['PRAKTIK', 'PILIHAN_GANDA', 'ESSAY']);
const MAKSIMAL_PERCOBAAN = 2;

// Durasi wajib diisi (menit, bilangan bulat positif) untuk PILIHAN_GANDA/
// ESSAY karena timer berjalan di lembar pengerjaan; opsional untuk PRAKTIK
// (lockdown tetap aktif tanpa timer bila tidak diisi); diabaikan untuk SUBMIT.
function parseDurasiMenit(tipe: string, raw: string | undefined): number | null {
  if (!NEEDS_SOAL.has(tipe) && tipe !== 'PRAKTIK') return null;
  if (raw === undefined || raw === '') {
    if (NEEDS_SOAL.has(tipe)) throw new BadRequestException('Durasi pengerjaan wajib diisi untuk tugas Pilihan Ganda/Essay');
    return null;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new BadRequestException('Durasi pengerjaan harus berupa bilangan menit positif');
  return n;
}

@Injectable()
export class TugasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async siswaKelasId(userId: string): Promise<string | null> {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId }, select: { kelasId: true } });
    return siswa?.kelasId ?? null;
  }

  private async notifySiswaBaru(kelasId: string | null, title: string, message: string) {
    const siswaUsers = await this.prisma.siswa.findMany({
      where: { userId: { not: null }, ...(kelasId ? { kelasId } : {}) },
      select: { userId: true },
    });
    await this.notificationService.createMany(
      siswaUsers.map((s) => s.userId!),
      { title, message, type: NotificationType.TUGAS, link: '/materi?tab=tugas' },
    );
  }

  // Guru hanya boleh membuat/mengubah Tugas untuk mapel yang benar-benar ia
  // ampu (sumber: GuruMapel, diimpor dari mapel.xlsx) — ADMIN tidak dibatasi.
  private async assertGuruMapel(actor: Actor, mapel: string) {
    if (actor.role !== 'GURU') return;
    const guru = await this.prisma.guru.findUnique({ where: { userId: actor.id } });
    const allowed = guru
      ? await this.prisma.guruMapel.findMany({ where: { guruId: guru.id }, select: { nama: true } })
      : [];
    if (!allowed.some((a) => a.nama === mapel)) {
      throw new ForbiddenException('Anda tidak terdaftar sebagai pengampu mata pelajaran ini');
    }
  }

  private assertOwnerOrAdmin(actor: Actor, createdById: string) {
    if (actor.role === 'GURU' && createdById !== actor.id) {
      throw new ForbiddenException('Anda hanya bisa mengubah tugas buatan sendiri');
    }
  }

  private async replaceSoal(tugasId: string, tipe: string, soalJson: string | undefined) {
    if (!NEEDS_SOAL.has(tipe)) return;
    const soal = parseJsonArray<SoalInput>(soalJson, 'soal');
    await this.prisma.tugasSoal.deleteMany({ where: { tugasId } });
    if (soal.length === 0) return;
    await this.prisma.tugasSoal.createMany({
      data: soal.map((s, i) => ({
        tugasId,
        urutan: i,
        pertanyaan: s.pertanyaan,
        pilihanA: s.pilihanA,
        pilihanB: s.pilihanB,
        pilihanC: s.pilihanC,
        pilihanD: s.pilihanD,
        jawabanBenar: s.jawabanBenar,
      })),
    });
  }

  async findAll(actor: Actor) {
    if (actor.role === 'SISWA') {
      const kelasId = await this.siswaKelasId(actor.id);
      const siswa = await this.prisma.siswa.findUnique({ where: { userId: actor.id }, select: { id: true } });
      const list = await this.prisma.tugas.findMany({
        where: kelasId ? { OR: [{ kelasId: null }, { kelasId }] } : { kelasId: null },
        orderBy: [{ deadline: 'asc' }],
        include: {
          kelas: INCLUDE_KELAS,
          createdBy: INCLUDE_CREATED_BY,
          submisi: siswa ? { where: { siswaId: siswa.id }, include: { jawaban: { include: { soal: true } } } } : false,
          soal: {
            ...SOAL_ORDER,
            select: { id: true, urutan: true, pertanyaan: true, pilihanA: true, pilihanB: true, pilihanC: true, pilihanD: true },
          },
          _count: { select: { submisi: true } },
        },
      });
      return list;
    }
    return this.prisma.tugas.findMany({
      orderBy: [{ deadline: 'asc' }],
      include: {
        kelas: INCLUDE_KELAS,
        createdBy: INCLUDE_CREATED_BY,
        soal: SOAL_ORDER,
        _count: { select: { submisi: true } },
      },
    });
  }

  async findOne(id: string, actor: Actor) {
    const tugas = await this.prisma.tugas.findUnique({
      where: { id },
      include: { kelas: INCLUDE_KELAS, createdBy: INCLUDE_CREATED_BY, soal: SOAL_ORDER },
    });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');

    if (actor.role === 'SISWA' && tugas.kelasId) {
      const kelasId = await this.siswaKelasId(actor.id);
      if (kelasId !== tugas.kelasId) throw new ForbiddenException('Tugas ini bukan untuk kelasmu');
    }
    if (actor.role === 'SISWA') {
      const siswa = await this.prisma.siswa.findUnique({ where: { userId: actor.id }, select: { id: true } });
      const submisi = siswa
        ? await this.prisma.tugasSubmisi.findMany({
            where: { tugasId: id, siswaId: siswa.id },
            include: { jawaban: { include: { soal: true } } },
          })
        : [];
      return { ...tugas, submisi, soal: tugas.soal.map(({ jawabanBenar: _jawabanBenar, ...rest }) => rest) };
    }
    return tugas;
  }

  async create(dto: CreateTugasDto, fileUrl: string | undefined, fileName: string | undefined, actor: Actor) {
    await this.assertGuruMapel(actor, dto.mapel);
    const tipe = dto.tipe || 'SUBMIT';
    const durasiMenit = parseDurasiMenit(tipe, dto.durasiMenit);
    const tugas = await this.prisma.tugas.create({
      data: {
        mapel: dto.mapel,
        kelasId: dto.kelasId || null,
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        deadline: new Date(dto.deadline),
        tipe,
        fileUrl,
        fileName,
        starterHtml: dto.starterHtml,
        starterCss: dto.starterCss,
        starterJs: dto.starterJs,
        durasiMenit,
        createdById: actor.id,
      },
    });
    await this.replaceSoal(tugas.id, tipe, dto.soal);
    await this.notifySiswaBaru(tugas.kelasId, 'Tugas baru', `${dto.mapel} — ${dto.judul}`);
    return this.prisma.tugas.findUnique({
      where: { id: tugas.id },
      include: { kelas: INCLUDE_KELAS, createdBy: INCLUDE_CREATED_BY, soal: SOAL_ORDER },
    });
  }

  async update(id: string, dto: UpdateTugasDto, fileUrl: string | undefined, fileName: string | undefined, actor: Actor) {
    const existing = await this.prisma.tugas.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tugas tidak ditemukan');
    this.assertOwnerOrAdmin(actor, existing.createdById);
    if (dto.mapel !== undefined) await this.assertGuruMapel(actor, dto.mapel);

    const effectiveTipe = dto.tipe ?? existing.tipe;
    const durasiMenit = dto.durasiMenit !== undefined || dto.tipe !== undefined
      ? parseDurasiMenit(effectiveTipe, dto.durasiMenit ?? (existing.durasiMenit != null ? String(existing.durasiMenit) : undefined))
      : undefined;

    const tugas = await this.prisma.tugas.update({
      where: { id },
      data: {
        ...(dto.mapel !== undefined ? { mapel: dto.mapel } : {}),
        ...(dto.kelasId !== undefined ? { kelasId: dto.kelasId || null } : {}),
        ...(dto.judul !== undefined ? { judul: dto.judul } : {}),
        ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi } : {}),
        ...(dto.deadline !== undefined ? { deadline: new Date(dto.deadline) } : {}),
        ...(dto.tipe !== undefined ? { tipe: dto.tipe } : {}),
        ...(dto.starterHtml !== undefined ? { starterHtml: dto.starterHtml } : {}),
        ...(dto.starterCss !== undefined ? { starterCss: dto.starterCss } : {}),
        ...(dto.starterJs !== undefined ? { starterJs: dto.starterJs } : {}),
        ...(durasiMenit !== undefined ? { durasiMenit } : {}),
        ...(fileUrl ? { fileUrl, fileName } : {}),
      },
    });
    if (dto.soal !== undefined) {
      await this.replaceSoal(tugas.id, dto.tipe ?? existing.tipe, dto.soal);
    }
    return this.prisma.tugas.findUnique({
      where: { id: tugas.id },
      include: { kelas: INCLUDE_KELAS, createdBy: INCLUDE_CREATED_BY, soal: SOAL_ORDER },
    });
  }

  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.tugas.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tugas tidak ditemukan');
    this.assertOwnerOrAdmin(actor, existing.createdById);
    return this.prisma.tugas.delete({ where: { id } });
  }

  async findBelumMengumpulkan(id: string) {
    const tugas = await this.prisma.tugas.findUnique({ where: { id } });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');

    const [target, submisi] = await Promise.all([
      this.prisma.siswa.findMany({
        where: tugas.kelasId ? { kelasId: tugas.kelasId } : {},
        select: {
          id: true,
          nama: true,
          kelas: { select: { id: true, nama: true } },
          user: { select: { id: true, nama: true } },
        },
        orderBy: [{ kelas: { nama: 'asc' } }, { nama: 'asc' }],
      }),
      this.prisma.tugasSubmisi.findMany({ where: { tugasId: id }, select: { siswaId: true } }),
    ]);
    const sudahMengumpulkan = new Set(submisi.map((s) => s.siswaId));
    return target.filter((s) => !sudahMengumpulkan.has(s.id));
  }

  findAllSubmisi() {
    return this.prisma.tugasSubmisi.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        tugas: { select: { id: true, judul: true, tipe: true, mapel: true } },
        siswa: { include: { user: { select: { id: true, nama: true } } } },
        jawaban: { include: { soal: true } },
      },
    });
  }

  async findMySubmisi(userId: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) return [];
    return this.prisma.tugasSubmisi.findMany({
      where: { siswaId: siswa.id },
      orderBy: { submittedAt: 'desc' },
      include: {
        tugas: { select: { id: true, judul: true } },
        jawaban: { include: { soal: true } },
      },
    });
  }

  async submitTugas(userId: string, dto: SubmitTugasDto, fileUrl: string | undefined, fileName: string | undefined) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new ForbiddenException('Profil siswa tidak ditemukan');
    const tugas = await this.prisma.tugas.findUnique({ where: { id: dto.tugasId } });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');

    const isPraktik = tugas.tipe === 'PRAKTIK';
    const isSoalBased = NEEDS_SOAL.has(tugas.tipe);
    if (!isPraktik && !isSoalBased && !fileUrl) throw new BadRequestException('File jawaban wajib diunggah');

    const data = isPraktik
      ? {
          submittedHtml: dto.submittedHtml ?? '',
          submittedCss: dto.submittedCss ?? '',
          submittedJs: dto.submittedJs ?? '',
          fileUrl: null,
          fileName: null,
        }
      : isSoalBased
      ? { fileUrl: null, fileName: null, submittedHtml: null, submittedCss: null, submittedJs: null }
      : { fileUrl, fileName, submittedHtml: null, submittedCss: null, submittedJs: null };

    const submisi = await this.prisma.tugasSubmisi.upsert({
      where: { tugasId_siswaId: { tugasId: dto.tugasId, siswaId: siswa.id } },
      create: { tugasId: dto.tugasId, siswaId: siswa.id, catatan: dto.catatan, ...data },
      update: { catatan: dto.catatan, status: 'TERKIRIM', pesanRevisi: null, updatedAt: new Date(), ...data },
    });

    if (isSoalBased) {
      const jawaban = parseJsonArray<JawabanInput>(dto.jawaban, 'jawaban');
      await this.prisma.tugasJawaban.deleteMany({ where: { submisiId: submisi.id } });
      if (jawaban.length > 0) {
        await this.prisma.tugasJawaban.createMany({
          data: jawaban
            .filter((j) => j.soalId)
            .map((j) => ({
              submisiId: submisi.id,
              soalId: j.soalId,
              jawabanPilihan: j.jawabanPilihan,
              jawabanEssay: j.jawabanEssay,
            })),
        });
      }

      // Pilihan ganda dinilai otomatis 0-100 (dibulatkan, tidak pernah koma) —
      // tipe soal-based lain (ESSAY) tetap butuh penilaian manual guru lewat
      // kunci jawaban, jadi nilai-nya dibiarkan null.
      if (tugas.tipe === 'PILIHAN_GANDA') {
        const soalList = await this.prisma.tugasSoal.findMany({
          where: { tugasId: tugas.id },
          select: { id: true, jawabanBenar: true },
        });
        const totalSoal = soalList.length;
        const jumlahBenar = soalList.filter((s) => {
          const j = jawaban.find((x) => x.soalId === s.id);
          return !!s.jawabanBenar && j?.jawabanPilihan === s.jawabanBenar;
        }).length;
        const nilai = totalSoal > 0 ? Math.round((jumlahBenar / totalSoal) * 100) : 0;
        await this.prisma.tugasSubmisi.update({ where: { id: submisi.id }, data: { nilai } });
      }
    }

    await this.notificationService.create({
      userId: tugas.createdById,
      title: 'Tugas dikumpulkan',
      message: `${siswa.nama ?? 'Siswa'} mengumpulkan tugas "${tugas.judul}"`,
      type: NotificationType.TUGAS,
      link: '/materi?tab=tugas',
    });

    return this.prisma.tugasSubmisi.findUnique({
      where: { id: submisi.id },
      include: { tugas: { select: { id: true, judul: true } }, jawaban: { include: { soal: true } } },
    });
  }

  async updateStatusSubmisi(id: string, status: 'TERKIRIM' | 'DITERIMA' | 'REVISI', pesanRevisi?: string) {
    const submisi = await this.prisma.tugasSubmisi.findUnique({
      where: { id },
      include: { siswa: { select: { userId: true } }, tugas: { select: { judul: true } } },
    });
    if (!submisi) throw new NotFoundException('Submisi tidak ditemukan');
    const updated = await this.prisma.tugasSubmisi.update({
      where: { id },
      data: {
        status,
        pesanRevisi: status === 'REVISI' ? (pesanRevisi ?? null) : null,
      },
    });
    if (submisi.siswa.userId) {
      await this.notificationService.create({
        userId: submisi.siswa.userId,
        title: status === 'DITERIMA' ? 'Tugas diterima!' : 'Tugas perlu direvisi',
        message: `Tugas "${submisi.tugas.judul}" ${status === 'DITERIMA' ? 'telah diterima' : 'perlu kamu perbaiki dan kirim ulang'}`,
        type: NotificationType.TUGAS,
        link: '/materi?tab=tugas',
      });
    }
    return updated;
  }

  // Nilai manual (0-100, integer) untuk tugas essay — guru mengisi ini setelah
  // membaca jawaban siswa dan membandingkan dengan kunci jawaban. Pilihan ganda
  // tidak pernah lewat sini karena sudah dinilai otomatis saat submit.
  async updateNilaiSubmisi(id: string, nilai: number) {
    const submisi = await this.prisma.tugasSubmisi.findUnique({
      where: { id },
      include: { siswa: { select: { userId: true } }, tugas: { select: { judul: true } } },
    });
    if (!submisi) throw new NotFoundException('Submisi tidak ditemukan');
    // Memberi nilai = selesai menilai — otomatis DITERIMA, tidak perlu klik
    // tombol Terima terpisah lagi.
    const updated = await this.prisma.tugasSubmisi.update({
      where: { id },
      data: { nilai, status: 'DITERIMA', pesanRevisi: null },
    });
    if (submisi.siswa.userId) {
      await this.notificationService.create({
        userId: submisi.siswa.userId,
        title: 'Tugas dinilai',
        message: `Nilai kamu untuk tugas "${submisi.tugas.judul}" adalah ${nilai}`,
        type: NotificationType.TUGAS,
        link: '/materi?tab=tugas',
      });
    }
    return updated;
  }

  // Membuka lembar pengerjaan (lockdown) — mengonsumsi 1 dari maksimal 2
  // percobaan SEKARANG (bukan saat submit), supaya membuka halaman lalu
  // langsung keluar tanpa menjawab apa pun tetap terhitung sebagai 1 upaya.
  // Jawaban/kode dari percobaan sebelumnya dibersihkan supaya siswa mulai
  // dari kosong, bukan melanjutkan percobaan yang sudah gagal/dipaksa keluar.
  async mulaiPercobaan(userId: string, tugasId: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new ForbiddenException('Profil siswa tidak ditemukan');
    const tugas = await this.prisma.tugas.findUnique({ where: { id: tugasId }, include: { soal: SOAL_ORDER } });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');
    if (!LOCKDOWN_TIPE.has(tugas.tipe)) {
      throw new BadRequestException('Tugas ini tidak menggunakan mode lembar pengerjaan');
    }
    if (tugas.kelasId && siswa.kelasId !== tugas.kelasId) {
      throw new ForbiddenException('Tugas ini bukan untuk kelasmu');
    }

    const existing = await this.prisma.tugasSubmisi.findUnique({
      where: { tugasId_siswaId: { tugasId, siswaId: siswa.id } },
    });
    if (existing?.status === 'DITERIMA') {
      throw new ForbiddenException('Tugas ini sudah diterima, tidak bisa dikerjakan lagi');
    }
    const percobaanKe = (existing?.jumlahPercobaan ?? 0) + 1;
    if (existing?.terkunci || percobaanKe > MAKSIMAL_PERCOBAAN) {
      throw new ForbiddenException(`Percobaan Anda untuk tugas ini sudah habis (maksimal ${MAKSIMAL_PERCOBAAN}x). Hubungi guru untuk mengulang.`);
    }

    const now = new Date();
    const deadlineWaktu = tugas.durasiMenit ? new Date(now.getTime() + tugas.durasiMenit * 60_000) : null;

    const submisi = await this.prisma.tugasSubmisi.upsert({
      where: { tugasId_siswaId: { tugasId, siswaId: siswa.id } },
      create: {
        tugasId,
        siswaId: siswa.id,
        jumlahPercobaan: 1,
        waktuMulai: now,
        deadlineWaktu,
      },
      update: {
        jumlahPercobaan: percobaanKe,
        waktuMulai: now,
        deadlineWaktu,
        dipaksaKeluar: false,
        status: 'TERKIRIM',
        pesanRevisi: null,
        submittedHtml: null,
        submittedCss: null,
        submittedJs: null,
      },
    });
    await this.prisma.tugasJawaban.deleteMany({ where: { submisiId: submisi.id } });

    return {
      submisiId: submisi.id,
      percobaanKe,
      maksimalPercobaan: MAKSIMAL_PERCOBAAN,
      waktuMulai: submisi.waktuMulai,
      deadlineWaktu: submisi.deadlineWaktu,
      tugas: {
        id: tugas.id,
        judul: tugas.judul,
        deskripsi: tugas.deskripsi,
        tipe: tugas.tipe,
        mapel: tugas.mapel,
        starterHtml: tugas.starterHtml,
        starterCss: tugas.starterCss,
        starterJs: tugas.starterJs,
        soal: tugas.soal.map(({ jawabanBenar: _jawabanBenar, ...rest }) => rest),
      },
    };
  }

  // Submit dari lembar pengerjaan — dipanggil baik saat siswa klik "Selesai"
  // (dipaksa=false) maupun otomatis saat sistem mendeteksi siswa meninggalkan
  // halaman (dipaksa=true, lihat POST /tugas/:id/paksa-keluar di controller).
  async submitPercobaan(userId: string, tugasId: string, dto: SubmitPercobaanDto) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new ForbiddenException('Profil siswa tidak ditemukan');
    const tugas = await this.prisma.tugas.findUnique({ where: { id: tugasId } });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');

    const submisi = await this.prisma.tugasSubmisi.findUnique({
      where: { tugasId_siswaId: { tugasId, siswaId: siswa.id } },
    });
    if (!submisi || !submisi.waktuMulai) {
      throw new BadRequestException('Anda belum memulai percobaan untuk tugas ini');
    }
    if (submisi.terkunci) {
      throw new ForbiddenException('Percobaan Anda untuk tugas ini sudah habis');
    }

    const isPraktik = tugas.tipe === 'PRAKTIK';
    const isSoalBased = NEEDS_SOAL.has(tugas.tipe);
    const terkunciBaru = submisi.jumlahPercobaan >= MAKSIMAL_PERCOBAAN;

    const updated = await this.prisma.tugasSubmisi.update({
      where: { id: submisi.id },
      data: {
        ...(isPraktik
          ? { submittedHtml: dto.submittedHtml ?? '', submittedCss: dto.submittedCss ?? '', submittedJs: dto.submittedJs ?? '' }
          : {}),
        catatan: dto.catatan,
        status: 'TERKIRIM',
        dipaksaKeluar: !!dto.dipaksa,
        terkunci: terkunciBaru,
        waktuMulai: null,
        deadlineWaktu: null,
      },
    });

    if (isSoalBased) {
      const jawaban = parseJsonArray<JawabanInput>(dto.jawaban, 'jawaban');
      await this.prisma.tugasJawaban.deleteMany({ where: { submisiId: updated.id } });
      if (jawaban.length > 0) {
        await this.prisma.tugasJawaban.createMany({
          data: jawaban
            .filter((j) => j.soalId)
            .map((j) => ({
              submisiId: updated.id,
              soalId: j.soalId,
              jawabanPilihan: j.jawabanPilihan,
              jawabanEssay: j.jawabanEssay,
            })),
        });
      }

      if (tugas.tipe === 'PILIHAN_GANDA') {
        const soalList = await this.prisma.tugasSoal.findMany({
          where: { tugasId: tugas.id },
          select: { id: true, jawabanBenar: true },
        });
        const totalSoal = soalList.length;
        const jumlahBenar = soalList.filter((s) => {
          const j = jawaban.find((x) => x.soalId === s.id);
          return !!s.jawabanBenar && j?.jawabanPilihan === s.jawabanBenar;
        }).length;
        const nilai = totalSoal > 0 ? Math.round((jumlahBenar / totalSoal) * 100) : 0;
        await this.prisma.tugasSubmisi.update({ where: { id: updated.id }, data: { nilai } });
      }
    }

    await this.notificationService.create({
      userId: tugas.createdById,
      title: dto.dipaksa ? 'Tugas otomatis dikumpulkan' : 'Tugas dikumpulkan',
      message: dto.dipaksa
        ? `${siswa.nama ?? 'Siswa'} terdeteksi keluar dari lembar pengerjaan "${tugas.judul}", jawaban otomatis tersimpan`
        : `${siswa.nama ?? 'Siswa'} mengumpulkan tugas "${tugas.judul}"`,
      type: NotificationType.TUGAS,
      link: '/materi?tab=tugas',
    });

    return this.prisma.tugasSubmisi.findUnique({
      where: { id: updated.id },
      include: { tugas: { select: { id: true, judul: true } }, jawaban: { include: { soal: true } } },
    });
  }

  // Reset jatah percobaan siswa (admin/guru pengampu) — dipakai kalau siswa
  // ke-auto-logout karena masalah teknis (mati listrik, jaringan putus, dst.)
  // dan wajar diberi kesempatan ulang di luar 2x jatah normal.
  async resetPercobaan(id: string, actor: Actor) {
    const submisi = await this.prisma.tugasSubmisi.findUnique({ where: { id }, include: { tugas: true } });
    if (!submisi) throw new NotFoundException('Submisi tidak ditemukan');
    this.assertOwnerOrAdmin(actor, submisi.tugas.createdById);
    return this.prisma.tugasSubmisi.update({
      where: { id },
      data: { jumlahPercobaan: 0, terkunci: false, dipaksaKeluar: false, waktuMulai: null, deadlineWaktu: null },
    });
  }
}
