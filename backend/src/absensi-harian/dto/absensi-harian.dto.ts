import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty, IsIn, IsArray, ArrayNotEmpty, ArrayUnique } from 'class-validator';

const HARI_VALUES = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

export class CreateKegiatanDto {
  @IsString()
  @IsNotEmpty()
  nama!: string;

  @IsString()
  @IsNotEmpty()
  tanggal!: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  jamMulai!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  jamSelesai!: number;

  @IsString()
  @IsOptional()
  keterangan?: string;
}

export class UpdateKegiatanDto {
  @IsString()
  @IsOptional()
  nama?: string;

  // Tanggal pelaksanaan boleh diedit admin lepas dari kapan kegiatan itu
  // dibuat — mis. kegiatan tanggal 9 dibuat sambil admin sedang melihat
  // tanggal 6/7.
  @IsString()
  @IsOptional()
  tanggal?: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  jamMulai?: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  jamSelesai?: number;

  @IsString()
  @IsOptional()
  keterangan?: string;
}

export class AbsenKegiatanDto {
  @IsString()
  @IsNotEmpty()
  kegiatanId!: string;

  @IsString()
  @IsNotEmpty()
  lokasi!: string;

  @IsString()
  @IsNotEmpty()
  ttd!: string;

  @IsString()
  @IsOptional()
  @IsIn(['HADIR', 'IZIN'])
  status?: 'HADIR' | 'IZIN';
}

export class KirimPengingatDto {
  @IsString()
  @IsNotEmpty()
  kegiatanId!: string;
}

export class VerifikasiAbsensiDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class CreateKegiatanRecurringDto {
  @IsString()
  @IsNotEmpty()
  nama!: string;

  // Bisa lebih dari 1 hari (atau ke-7 hari) sekaligus per aturan.
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(HARI_VALUES, { each: true })
  hari!: string[];

  @IsInt()
  @Min(0)
  @Max(1439)
  jamMulai!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  jamSelesai!: number;

  @IsString()
  @IsOptional()
  keterangan?: string;
}

export class UpdateKegiatanRecurringDto {
  @IsString()
  @IsOptional()
  nama?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(HARI_VALUES, { each: true })
  @IsOptional()
  hari?: string[];

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  jamMulai?: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  jamSelesai?: number;

  @IsString()
  @IsOptional()
  keterangan?: string;
}
