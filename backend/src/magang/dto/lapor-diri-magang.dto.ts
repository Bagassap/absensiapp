import { IsOptional, IsString } from 'class-validator';

export class SubmitLaporDiriDto {
  @IsString()
  @IsOptional()
  catatan?: string;
}
