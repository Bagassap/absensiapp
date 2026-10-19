import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';
import { Role, StatusPasswordReset } from '../../generated/prisma/client';

const SALT_ROUNDS = 10;

type TokenUser = {
  id: string;
  role: Role;
  nama: string;
  loginId: string | null;
  mustChangePassword: boolean;
  profileCompleted: boolean;
  bypassIdentityVerification: boolean;
  fotoProfil: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private signToken(user: TokenUser): string {
    return this.jwtService.sign({
      sub: user.id,
      role: user.role,
      nama: user.nama,
      loginId: user.loginId,
      mustChangePassword: user.mustChangePassword,
      profileCompleted: user.profileCompleted,
      bypassIdentityVerification: user.bypassIdentityVerification,
      fotoProfil: user.fotoProfil,
      hasFotoProfil: !!user.fotoProfil,
    });
  }

  async login(dto: LoginDto) {
    const profileInclude = {
      guru: { select: { id: true, nip: true } },
    };

    const loginId = dto.login.trim();

    let user = await this.prisma.user.findUnique({
      where: { email: loginId },
      include: profileInclude,
    });

    if (!user) {
      const candidates = await this.prisma.user.findMany({
        where: { loginId },
        include: profileInclude,
      });
      for (const candidate of candidates) {
        if (await bcrypt.compare(dto.password, candidate.password)) {
          user = candidate;
          break;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Akun tidak aktif, hubungi administrator',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }

    const token = this.signToken(user);

    return {
      access_token: token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        loginId: user.loginId,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        profileCompleted: user.profileCompleted,
        fotoProfil: user.fotoProfil,
        profil: this.getProfil(user),
      },
    };
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Akun tidak ditemukan');
    return { access_token: this.signToken(user) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nama: true,
        email: true,
        loginId: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        profileCompleted: true,
        fotoProfil: true,
        guru: { select: { id: true, nip: true } },
      },
    });
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Akun tidak ditemukan');
    }

    if (!user.mustChangePassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Password saat ini wajib diisi');
      }
      const currentMatch = await bcrypt.compare(
        dto.currentPassword,
        user.password,
      );
      if (!currentMatch) {
        throw new BadRequestException('Password saat ini salah');
      }
      if (dto.newPassword === dto.currentPassword) {
        throw new BadRequestException(
          'Password baru tidak boleh sama dengan password lama',
        );
      }
    } else if (!user.bypassIdentityVerification) {
      const coreName = (s: string) => s.split(',')[0].trim().toLowerCase();
      const expected = user.nama ? coreName(user.nama) : '';
      const given = dto.namaKonfirmasi ? coreName(dto.namaKonfirmasi) : '';
      if (!given) {
        throw new BadRequestException('Konfirmasi nama lengkap wajib diisi');
      }
      if (!expected || given !== expected) {
        throw new BadRequestException(
          'Data konfirmasi tidak sesuai dengan data akun ini. Pastikan Anda login dengan akun milik Anda sendiri.',
        );
      }
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak cocok');
    }

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false, bypassIdentityVerification: false },
    });

    const token = this.signToken(updated);

    return { access_token: token, message: 'Password berhasil diubah' };
  }

  async setFotoProfil(userId: string, fotoUrl: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fotoProfil: true },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fotoProfil: fotoUrl },
    });

    if (existing?.fotoProfil && existing.fotoProfil !== fotoUrl) {
      const oldPath = join(process.cwd(), existing.fotoProfil);
      fs.unlink(oldPath, () => {});
    }

    const token = this.signToken(updated);

    return { access_token: token, message: 'Foto profil berhasil disimpan', fotoProfil: updated.fotoProfil };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const loginId = dto.loginIdDiajukan.trim();

    const matchedUserId = (
      await this.prisma.user.findFirst({ where: { loginId }, select: { id: true } })
    )?.id;

    const existingPending = await this.prisma.passwordResetRequest.findFirst({
      where: {
        status: StatusPasswordReset.PENDING,
        OR: [
          ...(matchedUserId ? [{ userId: matchedUserId }] : []),
          { loginIdDiajukan: loginId },
        ],
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'Anda sudah mengirim permintaan reset password sebelumnya dan belum diproses admin. Silakan tunggu konfirmasi admin.',
      );
    }

    await this.prisma.passwordResetRequest.create({
      data: {
        userId: matchedUserId,
        namaPengaju: dto.namaPengaju.trim(),
        loginIdDiajukan: loginId,
        keterangan: dto.keterangan?.trim() || undefined,
      },
    });

    return { message: 'Permintaan reset password telah dikirim ke admin' };
  }

  private getProfil(user: any) {
    if (user.role === Role.GURU) return user.guru;
    return null;
  }
}
