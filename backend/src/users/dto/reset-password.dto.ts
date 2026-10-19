import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  newPassword?: string;

  @IsBoolean()
  @IsOptional()
  bypassIdentityVerification?: boolean;
}
