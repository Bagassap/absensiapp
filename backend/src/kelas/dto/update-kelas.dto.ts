import { IsString, IsOptional } from 'class-validator';

export class UpdateKelasDto {
  @IsString()
  @IsOptional()
  nama?: string;

  @IsString()
  @IsOptional()
  waliKelasGuruId?: string;
}
