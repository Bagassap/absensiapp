import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePengumumanDto {
  @IsString()
  @IsOptional()
  judul?: string;

  @IsString()
  @IsOptional()
  konten?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Umum', 'Akademik', 'Magang', 'Ujian', 'Lainnya'])
  kategori?: string;

  @IsString()
  @IsOptional()
  @IsIn(['NORMAL', 'PENTING', 'MENDESAK'])
  prioritas?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}
