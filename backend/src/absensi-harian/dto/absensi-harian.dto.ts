import { IsString, IsOptional, IsArray, IsIn, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

class AbsensiItemDto {
  @IsString()
  siswaId!: string;

  @IsString()
  status!: string;
}

export class UpsertAbsensiHarianDto {
  @IsString()
  kelasId!: string;

  @IsString()
  tanggal!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbsensiItemDto)
  absensi!: AbsensiItemDto[];
}

export class KirimPengingatDto {
  @IsString()
  kelasId!: string;

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
