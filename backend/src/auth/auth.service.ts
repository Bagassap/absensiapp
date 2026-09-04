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

  // Single source of truth for what goes into a session JWT — every field
  // the middleware or a page needs to make a routing decision without a DB
  // round-trip (mustChangePassword, profileCompleted, hasFotoProfil, ...)
  // has to flow through here so a new onboarding-gate field can't be added
  // in one JWT-issuing call site and silently missed in the other three.
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

    // Trim stray leading/trailing whitespace — a mobile keyboard
    // autosuggest, voice-to-text, or copy-paste from chat can easily append
    // one. Every lookup below is an EXACT match (email/loginId), so an
    // untrimmed value silently fails to find the account at all and the
    // user sees a generic "kredensial tidak valid" that looks identical to
    // an actually-wrong password — even though what they typed was
    // otherwise correct. Password itself is intentionally left untouched:
    // unlike a login ID, a password may legitimately contain meaningful
    // leading/trailing characters.
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

  // Re-issues a session JWT from the account's CURRENT DB state, without
  // requiring a full re-login. Needed because the onboarding gates
  // (mustChangePassword, hasFotoProfil, ...) are read from the JWT payload
  // by middleware, not re-queried per request — a session that predates a
  // change made on another device (e.g. a profile photo uploaded elsewhere)
  // keeps citing the stale claim for the rest of that token's lifetime
  // unless something like this refreshes it.
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
      // Forced change (first login, or reset by admin) — a bare "I know the
      // login ID" isn't proof of identity, since a colleague can read/guess
      // it. Require confirming the account's full name before letting the
      // new password through, so someone else's login attempt can't lock
      // the real account owner out. Skipped when an admin has already
      // verified the account owner's identity themselves and set the
      // one-time bypassIdentityVerification flag via resetPassword() —
      // needed for cases where the nama on file is itself wrong or
      // incomplete, which would otherwise lock the real owner out with no
      // self-service recovery.
      //
      // Guru names on file are frequently stored with a trailing academic
      // title ("Candra Tanu Wibowo, S.Kom") that nobody types when asked to
      // "confirm your full name" — compare only the part before the first
      // comma so the title can't block a legitimate owner forever.
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

    // Best-effort cleanup of the previous photo file (if any) — never block
    // the response over a stale file staying on disk.
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

    // One outstanding request at a time — otherwise someone who keeps
    // resubmitting (or a spammer) buries the admin's queue in duplicates for
    // the same account. Matched by userId when we could resolve one, and
    // always also by the raw loginId so an unresolved/typo'd login ID still
    // gets deduped against itself.
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
