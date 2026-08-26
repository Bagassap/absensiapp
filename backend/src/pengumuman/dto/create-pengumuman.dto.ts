import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePengumumanDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul tidak boleh kosong' })
  judul: string;

  @IsString()
  @IsNotEmpty({ message: 'Konten tidak boleh kosong' })
  konten: string;

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
