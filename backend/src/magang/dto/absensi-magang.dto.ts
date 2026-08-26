import { IsString, IsOptional, IsArray, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AbsenSendiriMagangDto {
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

class AbsensiMagangItemDto {
  @IsString()
  siswaId!: string;

  @IsString()
  status!: string;
}

export class UpsertAbsensiMagangDto {
  @IsString()
  tempatMagangId!: string;

  @IsString()
  tanggal!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbsensiMagangItemDto)
  absensi!: AbsensiMagangItemDto[];
}
