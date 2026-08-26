import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';
import { CreateMateriDto } from './dto/create-materi.dto';
import { UpdateMateriDto } from './dto/update-materi.dto';

type Actor = { id: string; role: string };

const INCLUDE_CREATED_BY = { select: { id: true, nama: true, role: true } } as const;
const INCLUDE_KELAS_LIST = { select: { id: true, nama: true }, orderBy: { nama: 'asc' as const } };

@Injectable()
export class MateriService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async siswaKelasId(userId: string): Promise<string | null> {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId }, select: { kelasId: true } });
    return siswa?.kelasId ?? null;
  }

  // kelasIds kosong ([]) berarti materi ini untuk "Semua Kelas" — notifikasi
  // dikirim ke seluruh siswa, bukan hanya kelas tertentu.
  private async notifySiswaBaru(kelasIds: string[], title: string, message: string) {
    const siswaUsers = await this.prisma.siswa.findMany({
      where: { userId: { not: null }, ...(kelasIds.length ? { kelasId: { in: kelasIds } } : {}) },
      select: { userId: true },
    });
    await this.notificationService.createMany(
      siswaUsers.map((s) => s.userId!),
      { title, message, type: NotificationType.TUGAS, link: '/materi' },
    );
  }

  // Guru hanya boleh membuat/mengubah Materi untuk mapel yang benar-benar ia
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
      throw new ForbiddenException('Anda hanya bisa mengubah materi buatan sendiri');
    }
  }

  async findAll(actor: Actor) {
    if (actor.role === 'SISWA') {
      const kelasId = await this.siswaKelasId(actor.id);
      return this.prisma.materi.findMany({
        where: {
          OR: [
            { kelasList: { none: {} } },
            ...(kelasId ? [{ kelasList: { some: { id: kelasId } } }] : []),
          ],
        },
        orderBy: [{ mapel: 'asc' }, { createdAt: 'desc' }],
        include: { createdBy: INCLUDE_CREATED_BY, kelasList: INCLUDE_KELAS_LIST },
      });
    }
    return this.prisma.materi.findMany({
      orderBy: [{ mapel: 'asc' }, { createdAt: 'desc' }],
      include: { createdBy: INCLUDE_CREATED_BY, kelasList: INCLUDE_KELAS_LIST },
    });
  }

  async findOne(id: string, actor: Actor) {
    const materi = await this.prisma.materi.findUnique({
      where: { id },
      include: { createdBy: INCLUDE_CREATED_BY, kelasList: INCLUDE_KELAS_LIST },
    });
    if (!materi) throw new NotFoundException('Materi tidak ditemukan');

    if (actor.role === 'SISWA' && materi.kelasList.length > 0) {
      const kelasId = await this.siswaKelasId(actor.id);
      if (!kelasId || !materi.kelasList.some((k) => k.id === kelasId)) {
        throw new ForbiddenException('Materi ini bukan untuk kelasmu');
      }
    }
    return materi;
  }

  async create(dto: CreateMateriDto, fileUrl: string | undefined, fileName: string | undefined, actor: Actor) {
    await this.assertGuruMapel(actor, dto.mapel);
    const kelasIds = dto.kelasIds ?? [];
    const materi = await this.prisma.materi.create({
      data: {
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        mapel: dto.mapel,
        kelasList: kelasIds.length ? { connect: kelasIds.map((id) => ({ id })) } : undefined,
        fileUrl,
        fileName,
        createdById: actor.id,
      },
      include: { createdBy: INCLUDE_CREATED_BY, kelasList: INCLUDE_KELAS_LIST },
    });
    await this.notifySiswaBaru(kelasIds, 'Materi baru', `${materi.mapel} — ${materi.judul}`);
    return materi;
  }

  async update(id: string, dto: UpdateMateriDto, fileUrl: string | undefined, fileName: string | undefined, actor: Actor) {
    const existing = await this.prisma.materi.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Materi tidak ditemukan');
    this.assertOwnerOrAdmin(actor, existing.createdById);
    if (dto.mapel !== undefined) await this.assertGuruMapel(actor, dto.mapel);

    return this.prisma.materi.update({
      where: { id },
      data: {
        ...(dto.judul !== undefined ? { judul: dto.judul } : {}),
        ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi } : {}),
        ...(dto.mapel !== undefined ? { mapel: dto.mapel } : {}),
        ...(dto.kelasIds !== undefined ? { kelasList: { set: dto.kelasIds.map((id) => ({ id })) } } : {}),
        ...(fileUrl ? { fileUrl, fileName } : {}),
      },
      include: { createdBy: INCLUDE_CREATED_BY, kelasList: INCLUDE_KELAS_LIST },
    });
  }

  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.materi.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Materi tidak ditemukan');
    this.assertOwnerOrAdmin(actor, existing.createdById);
    return this.prisma.materi.delete({ where: { id } });
  }
}
