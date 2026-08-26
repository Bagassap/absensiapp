import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePenempatanDto {
  @IsString()
  siswaId!: string;

  @IsString()
  tempatMagangId!: string;

  @IsString()
  guruPembimbingId!: string;

  @IsDateString()
  tanggalMulai!: string;

  @IsDateString()
  @IsOptional()
  tanggalSelesai?: string;
}

export class UpdatePenempatanDto {
  @IsString()
  @IsOptional()
  tempatMagangId?: string;

  @IsString()
  @IsOptional()
  guruPembimbingId?: string;

  @IsDateString()
  @IsOptional()
  tanggalMulai?: string;

  @IsDateString()
  @IsOptional()
  tanggalSelesai?: string;

  @IsString()
  @IsIn(['AKTIF', 'SELESAI', 'BATAL'])
  @IsOptional()
  status?: 'AKTIF' | 'SELESAI' | 'BATAL';
}
