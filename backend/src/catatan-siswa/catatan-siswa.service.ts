import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatatanSiswaDto } from './dto/create-catatan-siswa.dto';
import { UpdateCatatanSiswaDto } from './dto/update-catatan-siswa.dto';

type Actor = { id: string; role: string };

const INCLUDE_DICATAT_OLEH = { select: { id: true, nama: true, role: true } } as const;

@Injectable()
export class CatatanSiswaService {
  constructor(private readonly prisma: PrismaService) {}

  private async kelasWaliIds(userId: string): Promise<string[]> {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return [];
    const kelasWali = await this.prisma.kelas.findMany({ where: { waliKelasGuruId: guru.id }, select: { id: true } });
    return kelasWali.map((k) => k.id);
  }

  private async assertCanViewSiswa(siswaId: string, actor: Actor) {
    const siswa = await this.prisma.siswa.findUnique({ where: { id: siswaId } });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');

    if (actor.role === 'ADMIN') return siswa;
    if (actor.role === 'GURU') {
      const waliIds = await this.kelasWaliIds(actor.id);
      if (!waliIds.includes(siswa.kelasId)) throw new ForbiddenException('Siswa ini bukan dari kelas Anda');
      return siswa;
    }
    if (actor.role === 'SISWA') {
      if (siswa.userId !== actor.id) throw new ForbiddenException();
      return siswa;
    }
    throw new ForbiddenException();
  }

  async getSummary(actor: Actor) {
    const kelasIdFilter =
      actor.role === 'GURU' ? { in: await this.kelasWaliIds(actor.id) } : undefined;

    const siswaList = await this.prisma.siswa.findMany({
      where: kelasIdFilter ? { kelasId: kelasIdFilter } : undefined,
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, nis: true, kelas: { select: { id: true, nama: true } } },
    });

    const catatan = await this.prisma.catatanSiswa.findMany({
      where: { siswaId: { in: siswaList.map((s) => s.id) } },
      orderBy: { tanggal: 'desc' },
      select: { id: true, siswaId: true, judul: true, poin: true, tanggal: true },
    });

    return siswaList.map((s) => {
      const milik = catatan.filter((c) => c.siswaId === s.id);
      return {
        siswaId: s.id,
        nama: s.nama,
        nis: s.nis,
        kelas: s.kelas,
        jumlahCatatan: milik.length,
        totalPoin: milik.reduce((sum, c) => sum + (c.poin ?? 0), 0),
        catatanTerakhir: milik[0] ?? null,
      };
    });
  }

  async getForExport(actor: Actor, kelasId?: string) {
    const scopeIds = actor.role === 'GURU' ? await this.kelasWaliIds(actor.id) : null;

    if (kelasId) {
      if (scopeIds && !scopeIds.includes(kelasId)) {
        throw new ForbiddenException('Kelas ini bukan dari kelas Anda');
      }
    }

    const kelasIdFilter = kelasId ? kelasId : scopeIds ? { in: scopeIds } : undefined;

    const kelasList = await this.prisma.kelas.findMany({
      where: kelasIdFilter ? { id: kelasIdFilter } : undefined,
      orderBy: { nama: 'asc' },
      include: {
        siswa: {
          orderBy: { nama: 'asc' },
          include: {
            catatanSiswa: {
              orderBy: { tanggal: 'asc' },
              include: { dicatatOleh: { select: { nama: true } } },
            },
          },
        },
      },
    });
    return kelasList.map((k) => ({ kelas: { nama: k.nama }, siswa: k.siswa }));
  }

  async findBySiswa(siswaId: string, actor: Actor) {
    const siswa = await this.assertCanViewSiswa(siswaId, actor);
    const catatan = await this.prisma.catatanSiswa.findMany({
      where: { siswaId },
      orderBy: { tanggal: 'desc' },
      include: { dicatatOleh: INCLUDE_DICATAT_OLEH },
    });
    return {
      siswa: { id: siswa.id, nama: siswa.nama, nis: siswa.nis, kelasId: siswa.kelasId },
      catatan,
      totalPoin: catatan.reduce((sum, c) => sum + (c.poin ?? 0), 0),
    };
  }

  async findSaya(userId: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new NotFoundException('Profil siswa tidak ditemukan');
    return this.findBySiswa(siswa.id, { id: userId, role: 'SISWA' });
  }

  async create(dto: CreateCatatanSiswaDto, actor: Actor) {
    if (actor.role === 'GURU') {
      // guru boleh mencatat siswa manapun (bukan hanya wali kelasnya sendiri),
      // jadi di sini cukup pastikan siswanya benar ada, bukan pakai assertCanViewSiswa.
      const siswa = await this.prisma.siswa.findUnique({ where: { id: dto.siswaId } });
      if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');
    }
    return this.prisma.catatanSiswa.create({
      data: {
        siswaId: dto.siswaId,
        dicatatOlehId: actor.id,
        judul: dto.judul,
        catatan: dto.catatan,
        poin: dto.poin,
        tanggal: new Date(dto.tanggal),
      },
      include: { dicatatOleh: INCLUDE_DICATAT_OLEH },
    });
  }

  private async findOwnedOrFail(id: string, actor: Actor) {
    const existing = await this.prisma.catatanSiswa.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Catatan tidak ditemukan');
    if (actor.role !== 'ADMIN' && existing.dicatatOlehId !== actor.id) {
      throw new ForbiddenException('Hanya pencatat asli atau admin yang bisa mengubah catatan ini');
    }
    return existing;
  }

  async update(id: string, dto: UpdateCatatanSiswaDto, actor: Actor) {
    await this.findOwnedOrFail(id, actor);
    return this.prisma.catatanSiswa.update({
      where: { id },
      data: {
        ...(dto.judul !== undefined ? { judul: dto.judul } : {}),
        ...(dto.catatan !== undefined ? { catatan: dto.catatan } : {}),
        ...(dto.poin !== undefined ? { poin: dto.poin } : {}),
        ...(dto.tanggal !== undefined ? { tanggal: new Date(dto.tanggal) } : {}),
      },
      include: { dicatatOleh: INCLUDE_DICATAT_OLEH },
    });
  }

  async remove(id: string, actor: Actor) {
    await this.findOwnedOrFail(id, actor);
    return this.prisma.catatanSiswa.delete({ where: { id } });
  }
}
