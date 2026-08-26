import { IsInt, IsOptional, IsString, IsISO8601 } from 'class-validator';

export class UpdateCatatanSiswaDto {
  @IsString()
  @IsOptional()
  judul?: string;

  @IsString()
  @IsOptional()
  catatan?: string;

  @IsInt()
  @IsOptional()
  poin?: number;

  @IsISO8601()
  @IsOptional()
  tanggal?: string;
}
