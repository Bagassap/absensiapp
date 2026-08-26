import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitTugasDto {
  @IsString()
  @IsNotEmpty({ message: 'Tugas tidak boleh kosong' })
  tugasId: string;

  @IsString()
  @IsOptional()
  catatan?: string;

  @IsString()
  @IsOptional()
  submittedHtml?: string;

  @IsString()
  @IsOptional()
  submittedCss?: string;

  @IsString()
  @IsOptional()
  submittedJs?: string;

  // JSON string dari array jawaban [{soalId, jawabanPilihan?, jawabanEssay?}]
  // — dipakai untuk tugas tipe PILIHAN_GANDA/ESSAY.
  @IsString()
  @IsOptional()
  jawaban?: string;
}
