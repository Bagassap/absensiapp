import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Payload submit dari halaman lembar pengerjaan (lockdown) — dipakai baik
// untuk submit normal (klik "Selesai") maupun submit paksa (dipaksa=true,
// terpicu saat siswa terdeteksi keluar dari halaman).
export class SubmitPercobaanDto {
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
  @IsString()
  @IsOptional()
  jawaban?: string;

  @IsBoolean()
  @IsOptional()
  dipaksa?: boolean;
}
