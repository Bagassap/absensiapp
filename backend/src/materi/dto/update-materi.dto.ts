import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

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

export class UpdateMateriDto {
  @IsString()
  @IsOptional()
  judul?: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;

  @IsString()
  @IsOptional()
  mapel?: string;

  // undefined = field tidak dikirim (tidak diubah). Array kosong [] dikirim
  // eksplisit sebagai '[]' saat user memang ingin mengosongkan jadi "Semua
  // Kelas" — dibedakan dari "tidak diisi" lewat sentinel di service.
  @Transform(({ value }) => parseKelasIds(value))
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kelasIds?: string[];
}
