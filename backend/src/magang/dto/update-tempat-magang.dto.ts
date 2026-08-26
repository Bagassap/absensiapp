import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTempatMagangDto {
  @IsString()
  @IsOptional()
  namaTempat?: string;

  @IsString()
  @IsOptional()
  alamat?: string;

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
