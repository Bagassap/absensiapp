import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTugasDto {
  @IsString()
  @IsNotEmpty({ message: 'Mata pelajaran tidak boleh kosong' })
  mapel: string;

  @IsString()
  @IsOptional()
  kelasId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Judul tidak boleh kosong' })
  judul: string;

  @IsString()
  @IsOptional()
  deskripsi?: string;

  @IsString()
  @IsNotEmpty({ message: 'Deadline tidak boleh kosong' })
  deadline: string;

  @IsString()
  @IsOptional()
  @IsIn(['SUBMIT', 'PRAKTIK', 'PILIHAN_GANDA', 'ESSAY'])
  tipe?: string;

  @IsString()
  @IsOptional()
  starterHtml?: string;

  @IsString()
  @IsOptional()
  starterCss?: string;

  @IsString()
  @IsOptional()
  starterJs?: string;

  // JSON string dari array soal — dipakai untuk tipe PILIHAN_GANDA/ESSAY.
  // Diparse & divalidasi manual di service (bentuknya dinamis per tipe soal,
  // tidak praktis dipetakan ke class-validator per field).
  @IsString()
  @IsOptional()
  soal?: string;

  // Durasi pengerjaan (menit) untuk mode lockdown (PRAKTIK/PILIHAN_GANDA/
  // ESSAY) — string karena dikirim lewat multipart/form-data, diparse & wajib
  // divalidasi manual di service (wajib untuk PILIHAN_GANDA/ESSAY, opsional
  // untuk PRAKTIK, diabaikan untuk SUBMIT).
  @IsString()
  @IsOptional()
  durasiMenit?: string;
}
