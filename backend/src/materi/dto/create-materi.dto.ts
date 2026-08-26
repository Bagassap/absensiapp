import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

// Dikirim lewat multipart/form-data (satu form dengan file upload) sebagai
// string JSON — mis. fd.append('kelasIds', JSON.stringify(['id1','id2'])) —
// karena field berulang di FormData tidak konsisten diparse jadi array oleh
// multer. Kosong/tidak diisi berarti "Semua Kelas".
function parseKelasIds(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export class CreateMateriDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul tidak boleh kosong' })
  judul: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;

  @IsString()
  @IsNotEmpty({ message: 'Mapel tidak boleh kosong' })
  mapel: string;

  @Transform(({ value }) => parseKelasIds(value))
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kelasIds?: string[];
}
