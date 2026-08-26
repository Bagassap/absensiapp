import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengumumanDto } from './dto/create-pengumuman.dto';
import { UpdatePengumumanDto } from './dto/update-pengumuman.dto';
import { CreateKomentarDto } from './dto/create-komentar.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';

function toBaseSlug(judul: string): string {
  return judul
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

const AUTHOR_SELECT = { select: { id: true, nama: true, role: true, fotoProfil: true } } as const;

const INCLUDE_LIST = {
  author: AUTHOR_SELECT,
  _count: { select: { komentar: true } },
} as const;

const INCLUDE_DETAIL = {
  author: AUTHOR_SELECT,
  komentar: {
    where: { parentId: null },
    include: {
      author: AUTHOR_SELECT,
      replies: {
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class PengumumanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  findAll(kategori?: string, search?: string, pinned?: string) {
    return this.prisma.pengumuman.findMany({
      where: {
        ...(kategori ? { kategori } : {}),
        ...(pinned === '1' ? { isPinned: true } : {}),
        ...(search
          ? {
              OR: [
                { judul: { contains: search, mode: 'insensitive' } },
                { konten: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: INCLUDE_LIST,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(slugOrId: string) {
    const p = await this.prisma.pengumuman.findFirst({
      where: { OR: [{ id: slugOrId }, { slug: slugOrId }] },
      include: INCLUDE_DETAIL,
    });
    if (!p) throw new NotFoundException('Pengumuman tidak ditemukan');
    return p;
  }

  async create(dto: CreatePengumumanDto, authorId: string) {
    const slug = await this.ensureUniqueSlug(dto.judul);
    const p = await this.prisma.pengumuman.create({
      data: {
        slug,
        judul:    dto.judul,
        konten:   dto.konten,
        kategori: dto.kategori  ?? 'Umum',
        prioritas: dto.prioritas ?? 'NORMAL',
        isPinned: dto.isPinned  ?? false,
        authorId,
      },
      include: INCLUDE_LIST,
    });

    const recipients = await this.prisma.user.findMany({
      where: { id: { not: authorId } },
      select: { id: true },
    });
    await this.notificationService.createMany(
      recipients.map((r) => r.id),
      {
        title:   'Pengumuman baru',
        message: p.judul,
        type:    NotificationType.PENGUMUMAN,
        link:    '/pengumuman',
      },
    );

    return p;
  }

  async update(id: string, dto: UpdatePengumumanDto) {
    const existing = await this.findOne(id);
    return this.prisma.pengumuman.update({
      where: { id: existing.id },
      data: dto,
      include: INCLUDE_LIST,
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    return this.prisma.pengumuman.delete({ where: { id: existing.id } });
  }

  async addKomentar(
    pengumumanIdOrSlug: string,
    dto: CreateKomentarDto,
    authorId: string,
  ) {
    const p = await this.prisma.pengumuman.findFirst({
      where: { OR: [{ id: pengumumanIdOrSlug }, { slug: pengumumanIdOrSlug }] },
    });
    if (!p) throw new NotFoundException('Pengumuman tidak ditemukan');

    const komentar = await this.prisma.komentarPengumuman.create({
      data: {
        konten:      dto.konten,
        parentId:    dto.parentId ?? null,
        pengumumanId: p.id,
        authorId,
      },
      include: {
        author:  AUTHOR_SELECT,
        replies: { include: { author: AUTHOR_SELECT } },
      },
    });

    if (p.authorId !== authorId) {
      await this.notificationService.create({
        userId:  p.authorId,
        title:   'Komentar baru',
        message: `${komentar.author.nama} mengomentari pengumuman "${p.judul}"`,
        type:    NotificationType.PENGUMUMAN,
        link:    '/pengumuman',
      });
    }

    return komentar;
  }

  async deleteKomentar(komentarId: string, userId: string, userRole: string) {
    const k = await this.prisma.komentarPengumuman.findUnique({
      where: { id: komentarId },
    });
    if (!k) throw new NotFoundException('Komentar tidak ditemukan');

    if (userRole !== 'ADMIN' && k.authorId !== userId) {
      throw new ForbiddenException('Anda tidak bisa menghapus komentar ini');
    }

    return this.prisma.komentarPengumuman.delete({ where: { id: komentarId } });
  }

  private async ensureUniqueSlug(judul: string, excludeId?: string): Promise<string> {
    const base = toBaseSlug(judul);

    const taken = async (slug: string) => {
      const found = await this.prisma.pengumuman.findUnique({ where: { slug } });
      return found !== null && found.id !== excludeId;
    };

    if (!(await taken(base))) return base;

    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`;
      if (!(await taken(candidate))) return candidate;
    }

    return `${base}-${Date.now()}`;
  }
}
