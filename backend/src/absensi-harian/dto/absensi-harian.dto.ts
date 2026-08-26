import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';

export class AbsenSendiriHarianDto {
  @IsString()
  @IsOptional()
  @IsIn(['HADIR', 'PULANG', 'IZIN', 'SAKIT'])
  tipe?: 'HADIR' | 'PULANG' | 'IZIN' | 'SAKIT';

  @IsString()
  @IsOptional()
  lokasi?: string;

  @IsString()
  @IsOptional()
  waktuAbsen?: string;

  @IsString()
  @IsOptional()
  ttd?: string;

  @IsString()
  @IsOptional()
  catatan?: string;
}

export class KirimPengingatDto {
  @IsString()
  tanggal!: string;
}

export class UpsertJadwalOverrideDto {
  @IsString()
  tanggal!: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  hadirStartMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  hadirEndMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  pulangStartMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  @IsOptional()
  pulangEndMinutes?: number;

  @IsString()
  @IsOptional()
  keterangan?: string;
}
