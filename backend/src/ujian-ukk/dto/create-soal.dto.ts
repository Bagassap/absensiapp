import { IsString, IsOptional } from 'class-validator';

export class CreateSoalDto {
  @IsString()
  tahapanId: string;

  @IsString()
  judul: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;
}
