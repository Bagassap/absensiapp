import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSiswaDto } from './dto/update-siswa.dto';
import { UpdateProfilSiswaDto } from './dto/update-profil-siswa.dto';
import { LengkapiProfilSiswaDto } from './dto/lengkapi-profil-siswa.dto';

const INCLUDE_USER = {
  user: { select: { id: true, nama: true, email: true, mustChangePassword: true, fotoProfil: true } },
  kelas: {
    include: {
      waliKelasGuru: { include: { user: { select: { id: true, nama: true } } } },
    },
  },
} as const;

@Injectable()
export class SiswaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async kelasWaliIds(userId: string): Promise<string[]> {
    const guru = await this.prisma.guru.findUnique({ where: { userId } });
    if (!guru) return [];
    const kelasWali = await this.prisma.kelas.findMany({ where: { waliKelasGuruId: guru.id }, select: { id: true } });
    return kelasWali.map((k) => k.id);
  }

  async findAll(
    query: { search?: string; kelasId?: string; jurusan?: string; jenisKelamin?: string },
    actor: { id: string; role: string },
  ) {
    const { search, kelasId, jurusan, jenisKelamin } = query;

    let kelasIdFilter: string | { in: string[] } | undefined = kelasId;
    if (actor.role === 'GURU') {
      const waliIds = await this.kelasWaliIds(actor.id);
      kelasIdFilter = kelasId
        ? (waliIds.includes(kelasId) ? kelasId : { in: [] })
        : { in: waliIds };
    }

    return this.prisma.siswa.findMany({
      where: {
        status: 'AKTIF',
        ...(kelasIdFilter ? { kelasId: kelasIdFilter } : {}),
        ...(jurusan ? { jurusan } : {}),
        ...(jenisKelamin ? { jenisKelamin } : {}),
        ...(search
          ? {
              OR: [
                { nama: { contains: search, mode: 'insensitive' } },
                { nis: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: INCLUDE_USER,
      orderBy: [{ kelas: { nama: 'asc' } }, { nama: 'asc' }],
    });
  }

  async findOne(id: string, actor: { id: string; role: string }) {
    const siswa = await this.prisma.siswa.findUnique({ where: { id }, include: INCLUDE_USER });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');
    if (actor.role === 'GURU') {
      const waliIds = await this.kelasWaliIds(actor.id);
      if (!waliIds.includes(siswa.kelasId)) throw new NotFoundException('Siswa tidak ditemukan');
    }
    return siswa;
  }

  async findMine(userId: string) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId }, include: INCLUDE_USER });
    if (!siswa) throw new NotFoundException('Profil siswa tidak ditemukan');
    return siswa;
  }

  async update(id: string, dto: UpdateSiswaDto) {
    const exists = await this.prisma.siswa.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Siswa tidak ditemukan');
    const data: Record<string, unknown> = { ...dto };
    if (dto.tanggalLahir) data.tanggalLahir = new Date(dto.tanggalLahir);
    return this.prisma.siswa.update({ where: { id }, data, include: INCLUDE_USER });
  }

  async updateMine(userId: string, dto: UpdateProfilSiswaDto) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new ForbiddenException('Profil siswa tidak ditemukan');
    const data: Record<string, unknown> = {
      jenisKelamin: dto.jenisKelamin,
      tempatLahir: dto.tempatLahir,
      namaOrtu: dto.namaOrtu,
      noHp: dto.noHp,
      dukuh: dto.dukuh,
      rt: dto.rt,
      rw: dto.rw,
      desa: dto.desa,
      kecamatan: dto.kecamatan,
      kabupaten: dto.kabupaten,
    };
    if (dto.tanggalLahir) data.tanggalLahir = new Date(dto.tanggalLahir);
    return this.prisma.siswa.update({
      where: { id: siswa.id },
      data,
      include: INCLUDE_USER,
    });
  }

  async lengkapiProfil(userId: string, dto: LengkapiProfilSiswaDto) {
    const siswa = await this.prisma.siswa.findUnique({ where: { userId } });
    if (!siswa) throw new ForbiddenException('Profil siswa tidak ditemukan');

    await this.prisma.siswa.update({
      where: { id: siswa.id },
      data: {
        tempatLahir: dto.tempatLahir,
        tanggalLahir: new Date(dto.tanggalLahir),
        jenisKelamin: dto.jenisKelamin,
        noHp: dto.noHp,
        namaOrtu: dto.namaOrtu,
        dukuh: dto.dukuh,
        rt: dto.rt,
        rw: dto.rw,
        desa: dto.desa,
        kecamatan: dto.kecamatan,
        kabupaten: dto.kabupaten,
      },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true },
    });

    const payload = {
      sub: updatedUser.id,
      role: updatedUser.role,
      nama: updatedUser.nama,
      loginId: updatedUser.loginId,
      mustChangePassword: updatedUser.mustChangePassword,
      profileCompleted: updatedUser.profileCompleted,
      bypassIdentityVerification: updatedUser.bypassIdentityVerification,
      fotoProfil: updatedUser.fotoProfil,
      hasFotoProfil: !!updatedUser.fotoProfil,
    };
    const token = this.jwtService.sign(payload);

    return { access_token: token, message: 'Profil berhasil dilengkapi' };
  }

  /**
   * Groups siswa by kelas for the Data Siswa PDF/Excel export. With a
   * kelasId, returns just that one kelas (access-checked for GURU). Without
   * one, ADMIN gets every kelas and GURU is scoped to their own wali-kelas
   * classes automatically.
   */
  async getSiswaForExport(
    kelasId: string | undefined,
    jurusan: string | undefined,
    actor: { id: string; role: string },
  ) {
    if (kelasId && actor.role === 'GURU') {
      const waliIds = await this.kelasWaliIds(actor.id);
      if (!waliIds.includes(kelasId)) throw new ForbiddenException('Anda tidak memiliki akses ke kelas ini');
    }

    let kelasIds: string[] | undefined;
    if (kelasId) {
      kelasIds = [kelasId];
    } else if (actor.role === 'GURU') {
      kelasIds = await this.kelasWaliIds(actor.id);
    }

    const kelasList = await this.prisma.kelas.findMany({
      where: kelasIds ? { id: { in: kelasIds } } : undefined,
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true },
    });

    const groups: { kelas: { id: string; nama: string }; siswa: Awaited<ReturnType<typeof this.prisma.siswa.findMany>> }[] = [];
    for (const kelas of kelasList) {
      const siswa = await this.prisma.siswa.findMany({
        where: { kelasId: kelas.id, status: 'AKTIF', ...(jurusan ? { jurusan } : {}) },
        include: { user: { select: { mustChangePassword: true } } },
        orderBy: { nama: 'asc' },
      });
      if (siswa.length > 0) groups.push({ kelas, siswa });
    }
    return groups;
  }

  // Kenaikan kelas: pindahkan semua siswa AKTIF dari satu kelas ke kelas
  // lain sekaligus (mis. "X PPLG 1" -> "XI PPLG 1" di awal tahun ajaran
  // baru). Kelas tujuan harus sudah dibuat lebih dulu lewat Kelola Kelas.
  async naikkanKelas(dariKelasId: string, keKelasId: string) {
    if (dariKelasId === keKelasId) {
      throw new BadRequestException('Kelas asal dan tujuan tidak boleh sama');
    }
    const [dari, ke] = await Promise.all([
      this.prisma.kelas.findUnique({ where: { id: dariKelasId } }),
      this.prisma.kelas.findUnique({ where: { id: keKelasId } }),
    ]);
    if (!dari) throw new NotFoundException('Kelas asal tidak ditemukan');
    if (!ke) throw new NotFoundException('Kelas tujuan tidak ditemukan');

    const result = await this.prisma.siswa.updateMany({
      where: { kelasId: dariKelasId, status: 'AKTIF' },
      data: { kelasId: keKelasId },
    });
    return { jumlahSiswa: result.count, dariKelas: dari.nama, keKelas: ke.nama };
  }

  // Kelulusan: tandai semua siswa AKTIF di satu kelas (biasanya kelas XII)
  // sebagai LULUS. Data siswa & seluruh riwayatnya TETAP disimpan, cuma
  // otomatis hilang dari Data Siswa aktif — dan akun login mereka (kalau
  // ada) dinonaktifkan supaya alumni tidak bisa login lagi.
  async luluskanKelas(kelasId: string) {
    const kelas = await this.prisma.kelas.findUnique({ where: { id: kelasId } });
    if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');

    const siswaList = await this.prisma.siswa.findMany({
      where: { kelasId, status: 'AKTIF' },
      select: { id: true, userId: true },
    });
    const userIds = siswaList.filter((s) => s.userId).map((s) => s.userId!);

    await this.prisma.$transaction([
      this.prisma.siswa.updateMany({
        where: { id: { in: siswaList.map((s) => s.id) } },
        data: { status: 'LULUS', lulusPada: new Date() },
      }),
      ...(userIds.length > 0
        ? [this.prisma.user.updateMany({ where: { id: { in: userIds } }, data: { isActive: false } })]
        : []),
    ]);

    return { jumlahSiswa: siswaList.length, kelas: kelas.nama };
  }
}
