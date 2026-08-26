import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MapelService {
  constructor(private readonly prisma: PrismaService) {}

  async findMineByUserId(userId: string): Promise<string[]> {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return [];
    const rows = await this.prisma.guruMapel.findMany({
      where: { guruId: guru.id },
      select: { nama: true },
      orderBy: { nama: 'asc' },
    });
    return rows.map((r) => r.nama);
  }

  async listByGuruId(guruId: string) {
    const guru = await this.prisma.guru.findUnique({ where: { id: guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    return this.prisma.guruMapel.findMany({
      where: { guruId },
      orderBy: { nama: 'asc' },
    });
  }

  async addMapel(guruId: string, nama: string) {
    const guru = await this.prisma.guru.findUnique({ where: { id: guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    const existing = await this.prisma.guruMapel.findUnique({
      where: { guruId_nama: { guruId, nama: nama.trim() } },
    });
    if (existing) throw new ConflictException('Mapel ini sudah diampu guru tersebut');
    return this.prisma.guruMapel.create({ data: { guruId, nama: nama.trim() } });
  }

  async removeMapel(guruId: string, mapelId: string) {
    const row = await this.prisma.guruMapel.findUnique({ where: { id: mapelId } });
    if (!row || row.guruId !== guruId) throw new NotFoundException('Mapel tidak ditemukan');
    return this.prisma.guruMapel.delete({ where: { id: mapelId } });
  }
}
