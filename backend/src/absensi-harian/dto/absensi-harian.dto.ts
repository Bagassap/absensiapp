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

const HARI_KERJA_VALUES = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];

export class CreateJadwalDhuhaDto {
  @IsInt()
  @Min(1)
  @Max(4)
  minggu!: number;

  @IsIn(HARI_KERJA_VALUES)
  hari!: string;

  @IsString()
  @IsNotEmpty()
  guruId!: string;

  @IsString()
  @IsNotEmpty()
  kelas!: string;

  @IsString()
  @IsNotEmpty()
  mapel!: string;
}

export class UpdateJadwalDhuhaDto {
  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  minggu?: number;

  @IsIn(HARI_KERJA_VALUES)
  @IsOptional()
  hari?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  guruId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  kelas?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  mapel?: string;
}
