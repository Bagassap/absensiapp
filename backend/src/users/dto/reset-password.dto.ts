import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  newPassword?: string;

  // Admin has already confirmed the account owner's identity themselves
  // (e.g. in person) — skip the nama/tanggalLahir check on this student's
  // NEXT forced password change. Consumed automatically once used.
  @IsBoolean()
  @IsOptional()
  bypassIdentityVerification?: boolean;
}
