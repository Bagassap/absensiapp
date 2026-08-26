import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTempatMagangDto {
  @IsString()
  namaTempat!: string;

  @IsString()
  alamat!: string;

  @IsString()
  @IsOptional()
  kontak?: string;

  @IsString()
  @IsOptional()
  bidangUsaha?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  kuota?: number;
}
