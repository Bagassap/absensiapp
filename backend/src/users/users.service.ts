import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { join } from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';
import { Role, StatusPasswordReset } from '../../generated/prisma/client';
import { SUPER_ADMIN_LOGIN_ID } from '../auth/guards/super-admin.guard';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const ROLE_DASHBOARD: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  GURU: '/guru/absensi-harian',
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Resetting guru/admin accounts, including the super admin itself, stays
  // super-admin-only.
  async resetPassword(
    admin: { loginId?: string | null },
    id: string,
    dto: ResetPasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    if (admin.loginId !== SUPER_ADMIN_LOGIN_ID) {
      throw new ForbiddenException('Hanya super admin yang dapat mereset password akun ini');
    }

    if (!dto.newPassword) {
      throw new BadRequestException('Password baru wajib diisi');
    }

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashed,
        mustChangePassword: true,
        ...(dto.bypassIdentityVerification ? { bypassIdentityVerification: true } : {}),
      },
    });

    return { message: `Password ${user.nama} berhasil direset` };
  }

  async createAccount(dto: CreateUserDto) {
    try {
      const existing = await this.prisma.user.findFirst({ where: { loginId: dto.loginId } });
      if (existing) throw new ConflictException('Login ID sudah digunakan akun lain');

      const hashed = await bcrypt.hash(dto.password!, SALT_ROUNDS);
      const user = await this.prisma.user.create({
        data: {
          nama: dto.nama,
          loginId: dto.loginId,
          password: hashed,
          role: dto.role === 'GURU' ? Role.GURU : Role.ADMIN,
          mustChangePassword: true,
          ...(dto.role === 'GURU' ? { guru: { create: { nip: dto.nip || undefined, noWa: dto.noWa } } } : {}),
        },
        select: { id: true, nama: true, role: true, loginId: true },
      });
      return { message: `Akun ${dto.role === 'GURU' ? 'guru' : 'admin'} ${user.nama} berhasil dibuat`, id: user.id, loginId: user.loginId };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Login ID/NIP sudah digunakan akun lain');
      }
      throw err;
    }
  }

  async findPasswordStatus() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.GURU, Role.ADMIN] } },
      select: {
        id: true,
        nama: true,
        role: true,
        loginId: true,
        mustChangePassword: true,
        updatedAt: true,
        fotoProfil: true,
        guru: { select: { nip: true } },
      },
      orderBy: [{ role: 'asc' }, { nama: 'asc' }],
    });
  }

  async findGuruList() {
    return this.prisma.user.findMany({
      where: { role: Role.GURU },
      select: {
        id: true,
        nama: true,
        loginId: true,
        isActive: true,
        mustChangePassword: true,
        fotoProfil: true,
        updatedAt: true,
        guru: {
          select: {
            id: true,
            nip: true,
            noWa: true,
          },
        },
      },
      orderBy: { nama: 'asc' },
    });
  }

  // Nonaktifkan bukan hard-delete — akun dinonaktifkan (tidak bisa login
  // lagi) tapi seluruh riwayat absensi guru tetap tersimpan.
  async deactivateGuru(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { guru: true } });
    if (!user || user.role !== Role.GURU || !user.guru) {
      throw new NotFoundException('Guru tidak ditemukan');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return { message: `Akun ${user.nama} dinonaktifkan` };
  }

  async activateGuru(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.GURU) throw new NotFoundException('Guru tidak ditemukan');
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    return { message: `Akun ${user.nama} diaktifkan kembali` };
  }

  async updateGuru(userId: string, dto: UpdateGuruDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { guru: true } });
    if (!user || user.role !== Role.GURU || !user.guru) {
      throw new NotFoundException('Guru tidak ditemukan');
    }
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.nama !== undefined ? { nama: dto.nama } : {}),
          ...(dto.loginId !== undefined ? { loginId: dto.loginId } : {}),
          ...(dto.nip !== undefined || dto.noWa !== undefined
            ? {
                guru: {
                  update: {
                    ...(dto.nip !== undefined ? { nip: dto.nip || null } : {}),
                    ...(dto.noWa !== undefined ? { noWa: dto.noWa || null } : {}),
                  },
                },
              }
            : {}),
        },
      });
      return { message: `Data ${dto.nama ?? user.nama} berhasil diperbarui` };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Login ID/NIP sudah digunakan akun lain');
      }
      throw err;
    }
  }

  // Admin (Data Guru manager) mengganti foto profil seorang guru — beda dari
  // AuthService.setFotoProfil yang dipakai guru mengganti fotonya sendiri.
  async setGuruFoto(userId: string, fotoUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.GURU) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fotoProfil: fotoUrl },
    });

    // Best-effort cleanup of the previous photo file — never block the
    // response over a stale file staying on disk.
    if (user.fotoProfil && user.fotoProfil !== fotoUrl) {
      const oldPath = join(process.cwd(), user.fotoProfil);
      fs.unlink(oldPath, () => {});
    }

    return { message: `Foto ${user.nama} berhasil diperbarui`, fotoProfil: updated.fotoProfil };
  }

  async findPasswordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            role: true,
            fotoProfil: true,
            guru: { select: { nip: true } },
          },
        },
        processedBy: { select: { id: true, nama: true } },
      },
    });
  }

  async completePasswordResetRequest(id: string, adminId: string) {
    const reqRow = await this.prisma.passwordResetRequest.findUnique({ where: { id } });
    if (!reqRow) throw new NotFoundException('Permintaan tidak ditemukan');
    if (reqRow.status === StatusPasswordReset.SELESAI) {
      return reqRow;
    }
    return this.prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: StatusPasswordReset.SELESAI,
        processedAt: new Date(),
        processedById: adminId,
      },
    });
  }

  async impersonate(
    admin: { id: string; nama: string; role: string; loginId?: string | null },
    targetId: string,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User tidak ditemukan');
    // Blocks impersonating any admin account, which already covers the
    // super admin — no separate check needed to protect it specifically.
    if (target.role === Role.ADMIN) {
      throw new ForbiddenException('Tidak dapat memantau akun admin');
    }

    const payload = {
      sub: target.id,
      role: target.role,
      nama: target.nama,
      loginId: target.loginId,
      mustChangePassword: target.mustChangePassword,
      impersonatedBy: admin.id,
    };
    const token = this.jwtService.sign(payload);
    const redirectTo = ROLE_DASHBOARD[target.role] ?? '/guru/absensi-harian';

    console.log(
      `[IMPERSONATE] Admin ${admin.nama} masuk sebagai ${target.nama} pada ${new Date().toISOString()}`,
    );

    return { success: true, redirectTo, access_token: token };
  }

  stopImpersonate(user: { nama: string; impersonatedBy?: string | null }) {
    if (user.impersonatedBy) {
      console.log(
        `[IMPERSONATE] Sesi pantau terhadap ${user.nama} diakhiri pada ${new Date().toISOString()}`,
      );
    }
    return { success: true, redirectTo: '/admin/dashboard' };
  }
}
