import { IsIn, IsOptional, IsString } from 'class-validator';

export class SubmitLaporanAkhirDto {
  @IsString()
  @IsOptional()
  catatan?: string;
}

export class UpdateStatusLaporanAkhirDto {
  @IsString()
  @IsIn(['DITERIMA', 'REVISI'])
  status!: 'DITERIMA' | 'REVISI';

  @IsString()
  @IsOptional()
  pesanRevisi?: string;
}
