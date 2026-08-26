import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @MaxLength(150)
  namaPengaju: string;

  @IsString()
  @IsNotEmpty({ message: 'NIS/Kode Login wajib diisi' })
  @MaxLength(100)
  loginIdDiajukan: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  keterangan?: string;
}
