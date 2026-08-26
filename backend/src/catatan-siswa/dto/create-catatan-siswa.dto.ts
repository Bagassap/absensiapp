import { IsInt, IsNotEmpty, IsOptional, IsString, IsISO8601 } from 'class-validator';

export class CreateCatatanSiswaDto {
  @IsString()
  @IsNotEmpty({ message: 'Siswa wajib dipilih' })
  siswaId: string;

  @IsString()
  @IsNotEmpty({ message: 'Judul tidak boleh kosong' })
  judul: string;

  @IsString()
  @IsNotEmpty({ message: 'Catatan tidak boleh kosong' })
  catatan: string;

  @IsInt()
  @IsOptional()
  poin?: number;

  @IsISO8601()
  @IsNotEmpty({ message: 'Tanggal wajib diisi' })
  tanggal: string;
}
