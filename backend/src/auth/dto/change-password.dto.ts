import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password baru tidak boleh kosong' })
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Konfirmasi password tidak boleh kosong' })
  confirmPassword: string;

  // Identity verification for a FORCED password change (mustChangePassword),
  // required to stop someone who only knows a classmate's NIS from locking
  // the real owner out — see AuthService.changePassword for which of these
  // two is actually required, based on profileCompleted.
  @IsString()
  @IsOptional()
  namaKonfirmasi?: string;

  @IsString()
  @IsOptional()
  tanggalLahirKonfirmasi?: string;
}
