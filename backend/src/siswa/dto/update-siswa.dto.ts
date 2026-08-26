import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

// An empty-string date from a blank <input type="date"> must be treated as
// "not provided", but @IsOptional() only skips validation for null/undefined
// — without this, every save with an unset tanggalLahir fails IsDateString
// and the whole request (every other field too) gets rejected.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class UpdateSiswaDto {
  @IsString()
  @IsOptional()
  nama?: string;

  @IsString()
  @IsOptional()
  kelasId?: string;

  @IsString()
  @IsOptional()
  jurusan?: string;

  @IsNumber()
  @IsOptional()
  angkatan?: number;

  @IsString()
  @IsOptional()
  jenisKelamin?: string;

  @IsString()
  @IsOptional()
  noHp?: string;

  @IsString()
  @IsOptional()
  dukuh?: string;

  @IsString()
  @IsOptional()
  rt?: string;

  @IsString()
  @IsOptional()
  rw?: string;

  @IsString()
  @IsOptional()
  desa?: string;

  @IsString()
  @IsOptional()
  kecamatan?: string;

  @IsString()
  @IsOptional()
  kabupaten?: string;

  @IsString()
  @IsOptional()
  tempatLahir?: string;

  @Transform(emptyToUndefined)
  @IsDateString()
  @IsOptional()
  tanggalLahir?: string;

  @IsString()
  @IsOptional()
  namaOrtu?: string;
}
