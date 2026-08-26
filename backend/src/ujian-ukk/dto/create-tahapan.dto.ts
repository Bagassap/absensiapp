import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateTahapanDto {
  @IsInt()
  hariKe: number;

  @IsString()
  judul: string;

  @IsDateString()
  tanggal: string;

  @IsString()
  jamMulai: string;

  @IsString()
  jamSelesai: string;

  @IsString()
  lokasi: string;

  @IsString()
  @IsOptional()
  penguji?: string;

  @IsString()
  @IsOptional()
  keterangan?: string;
}
