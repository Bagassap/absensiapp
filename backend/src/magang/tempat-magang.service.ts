import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTempatMagangDto } from './dto/create-tempat-magang.dto';
import { UpdateTempatMagangDto } from './dto/update-tempat-magang.dto';

const INCLUDE_COUNT = {
  _count: { select: { penempatan: { where: { status: 'AKTIF' as const } } } },
} as const;

@Injectable()
export class TempatMagangService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tempatMagang.findMany({
      include: INCLUDE_COUNT,
      orderBy: { namaTempat: 'asc' },
    });
  }

  async findOne(id: string) {
    const tempat = await this.prisma.tempatMagang.findUnique({ where: { id }, include: INCLUDE_COUNT });
    if (!tempat) throw new NotFoundException('Tempat magang tidak ditemukan');
    return tempat;
  }

  create(dto: CreateTempatMagangDto) {
    return this.prisma.tempatMagang.create({
      data: {
        namaTempat: dto.namaTempat,
        alamat: dto.alamat,
        kontak: dto.kontak,
        bidangUsaha: dto.bidangUsaha,
        kuota: dto.kuota ?? 1,
      },
      include: INCLUDE_COUNT,
    });
  }

  async update(id: string, dto: UpdateTempatMagangDto) {
    await this.findOne(id);
    return this.prisma.tempatMagang.update({
      where: { id },
      data: {
        ...(dto.namaTempat !== undefined ? { namaTempat: dto.namaTempat } : {}),
        ...(dto.alamat !== undefined ? { alamat: dto.alamat } : {}),
        ...(dto.kontak !== undefined ? { kontak: dto.kontak } : {}),
        ...(dto.bidangUsaha !== undefined ? { bidangUsaha: dto.bidangUsaha } : {}),
        ...(dto.kuota !== undefined ? { kuota: dto.kuota } : {}),
      },
      include: INCLUDE_COUNT,
    });
  }

  async remove(id: string) {
    const tempat = await this.prisma.tempatMagang.findUnique({
      where: { id },
      include: { _count: { select: { penempatan: true } } },
    });
    if (!tempat) throw new NotFoundException('Tempat magang tidak ditemukan');
    if (tempat._count.penempatan > 0) {
      throw new BadRequestException('Tempat ini masih memiliki riwayat penempatan siswa, tidak dapat dihapus');
    }
    return this.prisma.tempatMagang.delete({ where: { id } });
  }
}
