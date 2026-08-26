import { IsString, IsOptional } from 'class-validator';

export class CreateDiskusiDto {
  @IsString()
  konten: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
