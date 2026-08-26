import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateKomentarDto {
  @IsString()
  @IsNotEmpty({ message: 'Konten komentar tidak boleh kosong' })
  konten: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
