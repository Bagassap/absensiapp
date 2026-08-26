import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKelasDto } from './dto/create-kelas.dto';
import { UpdateKelasDto } from './dto/update-kelas.dto';

const INCLUDE_WALI = {
  waliKelasGuru: { include: { user: { select: { id: true, nama: true } } } },
  _count: { select: { siswa: true } },
} as const;

@Injectable()
export class KelasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.kelas.findMany({
      include: INCLUDE_WALI,
      orderBy: { nama: 'asc' },
    });
  }

  async findMine(userId: string) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) throw new NotFoundException('Profil guru tidak ditemukan');
    return this.prisma.kelas.findMany({
      where: { waliKelasGuruId: guru.id },
      include: INCLUDE_WALI,
      orderBy: { nama: 'asc' },
    });
  }

  getGuruList() {
    return this.prisma.guru.findMany({
      include: { user: { select: { id: true, nama: true } } },
      orderBy: { user: { nama: 'asc' } },
    });
  }

  async create(dto: CreateKelasDto) {
    return this.prisma.kelas.create({
      data: { nama: dto.nama, waliKelasGuruId: dto.waliKelasGuruId || null },
      include: INCLUDE_WALI,
    });
  }

  async update(id: string, dto: UpdateKelasDto) {
    await this.findOne(id);
    return this.prisma.kelas.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama } : {}),
        ...(dto.waliKelasGuruId !== undefined ? { waliKelasGuruId: dto.waliKelasGuruId || null } : {}),
      },
      include: INCLUDE_WALI,
    });
  }

  async findOne(id: string) {
    const kelas = await this.prisma.kelas.findUnique({ where: { id }, include: INCLUDE_WALI });
    if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');
    return kelas;
  }

  async remove(id: string) {
    const kelas = await this.findOne(id);
    const jumlahSiswa = (kelas as any)._count.siswa;
    if (jumlahSiswa > 0) {
      throw new BadRequestException('Kelas masih memiliki siswa, pindahkan siswa terlebih dahulu');
    }
    return this.prisma.kelas.delete({ where: { id } });
  }

  async getGuruKelasIds(userId: string): Promise<string[]> {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return [];
    const kelas = await this.prisma.kelas.findMany({
      where: { waliKelasGuruId: guru.id },
      select: { id: true },
    });
    return kelas.map((k) => k.id);
  }
}
