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

  @IsString()
  @IsOptional()
  namaKonfirmasi?: string;
}
