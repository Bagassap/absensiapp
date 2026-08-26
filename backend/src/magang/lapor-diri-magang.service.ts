import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { todayJakarta as todayStr } from '../common/utils/jakarta-date.util';
import type { Prisma } from '../../generated/prisma/client';

// "YYYY-MM" — satu laporan wajib per siswa per bulan berjalan, bukan per
// tanggal upload (siswa boleh unggah kapan saja dalam bulan itu).
function currentPeriode(): string {
  return todayStr().slice(0, 7);
}

@Injectable()
export class LaporDiriMagangService {
  constructor(private readonly prisma: PrismaService) {}

  async getForActor(userId: string, role: string, periode?: string, tempatMagangId?: string) {
    const p = periode || currentPeriode();
    const where: Prisma.PenempatanMagangWhereInput = { status: 'AKTIF' };

    if (role === 'GURU') {
      const guru = await this.prisma.guru.findUnique({ where: { userId } });
      if (!guru) return { periode: p, summary: { total: 0, sudahLapor: 0, belumLapor: 0 }, rows: [] };
      where.guruPembimbingId = guru.id;
    }
    if (tempatMagangId) where.tempatMagangId = tempatMagangId;

    const penempatanList = await this.prisma.penempatanMagang.findMany({
      where,
      include: {
        siswa: { include: { user: { select: { nama: true, fotoProfil: true } } } },
        tempatMagang: { select: { id: true, namaTempat: true } },
        guruPembimbing: { select: { id: true, user: { select: { nama: true } } } },
      },
      orderBy: { siswa: { nama: 'asc' } },
    });

    const laporList = penempatanList.length
      ? await this.prisma.laporDiriMagang.findMany({
          where: { penempatanId: { in: penempatanList.map((x) => x.id) }, periode: p },
        })
      : [];
    const laporMap = new Map(laporList.map((l) => [l.penempatanId, l]));

    const rows = penempatanList.map((pn) => {
      const lapor = laporMap.get(pn.id) ?? null;
      return {
        penempatanId: pn.id,
        siswa: {
          id: pn.siswa.id,
          nama: pn.siswa.user?.nama ?? pn.siswa.nama,
          nis: pn.siswa.nis,
          fotoProfil: pn.siswa.user?.fotoProfil ?? null,
        },
        tempatMagang: pn.tempatMagang,
        guruPembimbing: { id: pn.guruPembimbing.id, nama: pn.guruPembimbing.user?.nama ?? null },
        sudahLapor: !!lapor,
        laporDiri: lapor
          ? { id: lapor.id, fileUrl: lapor.fileUrl, fileName: lapor.fileName, catatan: lapor.catatan, createdAt: lapor.createdAt }
          : null,
      };
    });

    const summary = {
      total: rows.length,
      sudahLapor: rows.filter((r) => r.sudahLapor).length,
      belumLapor: rows.filter((r) => !r.sudahLapor).length,
    };

    return { periode: p, summary, rows };
  }

  async getStatusSaya(userId: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) return { hasPenempatan: false as const };

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId: siswa.id, status: 'AKTIF' },
      include: { tempatMagang: true },
    });
    if (!penempatan) return { hasPenempatan: false as const };

    const periode = currentPeriode();
    const [current, history] = await Promise.all([
      this.prisma.laporDiriMagang.findUnique({ where: { penempatanId_periode: { penempatanId: penempatan.id, periode } } }),
      this.prisma.laporDiriMagang.findMany({ where: { penempatanId: penempatan.id }, orderBy: { periode: 'desc' } }),
    ]);

    return {
      hasPenempatan: true as const,
      tempatMagang: penempatan.tempatMagang,
      periode,
      sudahLapor: !!current,
      current,
      history,
    };
  }

  async submit(userId: string, catatan: string | undefined, fileUrl: string, fileName: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new NotFoundException('Profil siswa tidak ditemukan');

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId: siswa.id, status: 'AKTIF' },
    });
    if (!penempatan) throw new BadRequestException('Anda tidak memiliki penempatan PKL yang aktif saat ini');

    const periode = currentPeriode();
    return this.prisma.laporDiriMagang.upsert({
      where: { penempatanId_periode: { penempatanId: penempatan.id, periode } },
      update: { fileUrl, fileName, catatan },
      create: {
        siswaId: siswa.id,
        penempatanId: penempatan.id,
        tempatMagangId: penempatan.tempatMagangId,
        periode,
        fileUrl,
        fileName,
        catatan,
      },
    });
  }
}
