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
      siswa: {
        select: {
          id: true,
          nis: true,
          kelas: { select: { id: true, nama: true } },
          angkatan: true,
        },
      },
      guru: { select: { id: true, nip: true } },
    };

    // Trim stray leading/trailing whitespace — a mobile keyboard
    // autosuggest, voice-to-text, or copy-paste from chat can easily append
    // one. Every lookup below is an EXACT match (email/nis/loginId), so an
    // untrimmed value silently fails to find the account at all and the
    // student sees a generic "kredensial tidak valid" that looks identical
    // to an actually-wrong password — even though what they typed was
    // otherwise correct. Password itself is intentionally left untouched:
    // unlike a login ID, a password may legitimately contain meaningful
    // leading/trailing characters.
    const loginId = dto.login.trim();

    let user = await this.prisma.user.findUnique({
      where: { email: loginId },
      include: profileInclude,
    });

    if (!user) {
      const siswa = await this.prisma.siswa.findUnique({
        where: { nis: loginId },
        include: { user: { include: profileInclude } },
      });
      if (siswa) {
        user = siswa.user;
      }
    }

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
        siswa: {
          select: {
            id: true,
            nis: true,
            kelas: { select: { id: true, nama: true } },
            angkatan: true,
          },
        },
        guru: { select: { id: true, nip: true } },
      },
    });
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { siswa: { select: { tanggalLahir: true } } },
    });
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
      // NIS" isn't proof of identity, since a classmate can read/guess it.
      // Require one more piece of identity data before letting the new
      // password through, so someone else's login attempt can't lock the
      // real account owner out. Skipped when an admin has already verified
      // the account owner's identity themselves and set the one-time
      // bypassIdentityVerification flag via resetPassword() — needed for
      // cases where the nama/tanggalLahir on file is itself wrong or
      // incomplete, which would otherwise lock the real owner out with no
      // self-service recovery.
      const mismatchMessage =
        'Data konfirmasi tidak sesuai dengan data akun ini. Pastikan Anda login dengan akun milik Anda sendiri.';
      if (!user.profileCompleted) {
        // Never completed lengkapi-profil yet — the only identity data on
        // file at all is the name imported from the school's CSV roster.
        // Guru names on file are frequently stored with a trailing academic
        // title ("Candra Tanu Wibowo, S.Kom") that nobody types when asked
        // to "confirm your full name" — compare only the part before the
        // first comma so the title can't block a legitimate owner forever.
        const coreName = (s: string) => s.split(',')[0].trim().toLowerCase();
        const expected = user.nama ? coreName(user.nama) : '';
        const given = dto.namaKonfirmasi ? coreName(dto.namaKonfirmasi) : '';
        if (!given) {
          throw new BadRequestException('Konfirmasi nama lengkap wajib diisi');
        }
        if (!expected || given !== expected) {
          throw new BadRequestException(mismatchMessage);
        }
      } else {
        // Already completed lengkapi-profil at some earlier point (so this
        // is an admin-triggered reset) — a birth date the student entered
        // themselves is much harder for a classmate to know or guess than
        // their own name.
        const tanggalLahir = user.siswa?.tanggalLahir;
        if (!tanggalLahir) {
          throw new BadRequestException(
            'Data tanggal lahir tidak ditemukan untuk verifikasi. Hubungi admin untuk bantuan reset password.',
          );
        }
        const given = dto.tanggalLahirKonfirmasi?.trim();
        if (!given) {
          throw new BadRequestException('Konfirmasi tanggal lahir wajib diisi');
        }
        const expected = tanggalLahir.toISOString().slice(0, 10);
        if (given !== expected) {
          throw new BadRequestException(mismatchMessage);
        }
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

    const siswa = await this.prisma.siswa.findUnique({
      where: { nis: loginId },
      select: { userId: true },
    });
    const matchedUserId =
      siswa?.userId ??
      (await this.prisma.user.findFirst({ where: { loginId }, select: { id: true } }))?.id;

    // One outstanding request at a time — otherwise a student who keeps
    // resubmitting (or a spammer) buries the admin's queue in duplicates for
    // the same account. Matched by userId when we could resolve one, and
    // always also by the raw loginId so an unresolved/typo'd NIS still gets
    // deduped against itself.
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
    if (user.role === Role.SISWA) return user.siswa;
    if (user.role === Role.GURU) return user.guru;
    return null;
  }
}
