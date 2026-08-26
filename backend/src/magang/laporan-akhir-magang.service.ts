import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../generated/prisma/client';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class LaporanAkhirMagangService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getForActor(userId: string, role: string, tempatMagangId?: string) {
    // Penempatan AKTIF selalu tampil (supaya kelihatan siapa yang belum
    // lapor), TAPI penempatan yang sudah SELESAI/BATAL pun tetap harus
    // muncul kalau siswanya sudah pernah kirim laporan akhir — kalau tidak,
    // begitu admin menandai penempatan selesai, laporan yang sedang
    // menunggu review jadi tidak bisa ditemukan lagi lewat halaman ini.
    const where: Prisma.PenempatanMagangWhereInput = {
      OR: [{ status: 'AKTIF' }, { laporanAkhir: { isNot: null } }],
    };

    if (role === 'GURU') {
      const guru = await this.prisma.guru.findUnique({ where: { userId } });
      if (!guru) return [];
      where.guruPembimbingId = guru.id;
    }
    if (tempatMagangId) where.tempatMagangId = tempatMagangId;

    const penempatanList = await this.prisma.penempatanMagang.findMany({
      where,
      include: {
        siswa: { include: { user: { select: { nama: true, fotoProfil: true } } } },
        tempatMagang: { select: { id: true, namaTempat: true } },
        guruPembimbing: { select: { id: true, user: { select: { nama: true } } } },
        laporanAkhir: true,
      },
      orderBy: { siswa: { nama: 'asc' } },
    });

    return penempatanList.map((pn) => ({
      penempatanId: pn.id,
      siswa: {
        id: pn.siswa.id,
        nama: pn.siswa.user?.nama ?? pn.siswa.nama,
        nis: pn.siswa.nis,
        fotoProfil: pn.siswa.user?.fotoProfil ?? null,
      },
      tempatMagang: pn.tempatMagang,
      guruPembimbing: { id: pn.guruPembimbing.id, nama: pn.guruPembimbing.user?.nama ?? null },
      laporan: pn.laporanAkhir,
    }));
  }

  private async assertGuruOwnsPenempatan(penempatanId: string, userId: string) {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    const penempatan = await this.prisma.penempatanMagang.findUnique({ where: { id: penempatanId } });
    if (!penempatan || !guru || penempatan.guruPembimbingId !== guru.id) {
      throw new ForbiddenException('Anda bukan pembimbing PKL untuk siswa ini');
    }
  }

  async getStatusSaya(userId: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) return { hasPenempatan: false as const };

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId: siswa.id, status: 'AKTIF' },
      include: { tempatMagang: true, laporanAkhir: true },
    });
    if (!penempatan) return { hasPenempatan: false as const };

    return {
      hasPenempatan: true as const,
      tempatMagang: penempatan.tempatMagang,
      laporan: penempatan.laporanAkhir,
    };
  }

  async submit(userId: string, catatan: string | undefined, fileUrl: string, fileName: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new NotFoundException('Profil siswa tidak ditemukan');

    const penempatan = await this.prisma.penempatanMagang.findFirst({
      where: { siswaId: siswa.id, status: 'AKTIF' },
      include: {
        laporanAkhir: true,
        tempatMagang: { select: { namaTempat: true } },
        guruPembimbing: { select: { userId: true } },
      },
    });
    if (!penempatan) throw new BadRequestException('Anda tidak memiliki penempatan PKL yang aktif saat ini');

    const existing = penempatan.laporanAkhir;
    if (existing && existing.status !== 'REVISI') {
      throw new BadRequestException(
        existing.status === 'DITERIMA'
          ? 'Laporan akhir Anda sudah diterima, tidak bisa diunggah ulang'
          : 'Laporan akhir sudah pernah dikirim dan sedang direview, tunggu hasil review sebelum mengirim ulang',
      );
    }

    const data = { fileUrl, fileName, catatan, status: 'TERKIRIM' as const, pesanRevisi: null };
    const laporan = existing
      ? await this.prisma.laporanAkhirMagang.update({ where: { penempatanId: penempatan.id }, data })
      : await this.prisma.laporanAkhirMagang.create({
          data: { siswaId: siswa.id, penempatanId: penempatan.id, tempatMagangId: penempatan.tempatMagangId, ...data },
        });

    if (penempatan.guruPembimbing.userId) {
      await this.notificationService.create({
        userId: penempatan.guruPembimbing.userId,
        title: 'Laporan akhir PKL dikirim',
        message: `${siswa.nama ?? 'Siswa'} mengirim laporan akhir PKL di ${penempatan.tempatMagang.namaTempat}`,
        type: NotificationType.MAGANG,
        link: '/magang/rekap',
      }).catch(() => {});
    }

    return laporan;
  }

  async updateStatus(penempatanId: string, status: 'DITERIMA' | 'REVISI', pesanRevisi: string | undefined, actorUserId: string, actorRole: string) {
    if (actorRole === 'GURU') await this.assertGuruOwnsPenempatan(penempatanId, actorUserId);

    const existing = await this.prisma.laporanAkhirMagang.findUnique({
      where: { penempatanId },
      include: { siswa: { select: { userId: true, nama: true } }, tempatMagang: { select: { namaTempat: true } } },
    });
    if (!existing) throw new NotFoundException('Laporan akhir belum dikirim oleh siswa ini');

    const updated = await this.prisma.laporanAkhirMagang.update({
      where: { penempatanId },
      data: { status, pesanRevisi: status === 'REVISI' ? (pesanRevisi?.trim() || null) : null },
    });

    if (existing.siswa.userId) {
      await this.notificationService.create({
        userId: existing.siswa.userId,
        title: status === 'DITERIMA' ? 'Laporan akhir PKL diterima!' : 'Laporan akhir PKL perlu direvisi',
        message: status === 'DITERIMA'
          ? `Laporan akhir PKL-mu di ${existing.tempatMagang.namaTempat} sudah diterima`
          : `Laporan akhir PKL-mu di ${existing.tempatMagang.namaTempat} perlu direvisi, silakan kirim ulang`,
        type: NotificationType.MAGANG,
        link: '/magang/rekap',
      }).catch(() => {});
    }

    return updated;
  }
}
