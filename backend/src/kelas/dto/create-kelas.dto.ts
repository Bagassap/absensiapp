import { IsString, IsOptional } from 'class-validator';

export class CreateKelasDto {
  @IsString()
  nama!: string;

  @IsString()
  @IsOptional()
  waliKelasGuruId?: string;
}
