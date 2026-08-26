import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTugasDto {
  @IsString()
  @IsOptional()
  mapel?: string;

  @IsString()
  @IsOptional()
  kelasId?: string;

  @IsString()
  @IsOptional()
  judul?: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  @IsIn(['SUBMIT', 'PRAKTIK', 'PILIHAN_GANDA', 'ESSAY'])
  tipe?: string;

  @IsString()
  @IsOptional()
  starterHtml?: string;

  @IsString()
  @IsOptional()
  starterCss?: string;

  @IsString()
  @IsOptional()
  starterJs?: string;

  @IsString()
  @IsOptional()
  soal?: string;

  @IsString()
  @IsOptional()
  durasiMenit?: string;
}
