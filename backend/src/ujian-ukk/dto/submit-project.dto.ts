import { IsString, IsOptional, IsUrl } from 'class-validator';

export class SubmitProjectDto {
  @IsString()
  soalId: string;

  @IsString()
  @IsOptional()
  catatan?: string;

  @IsString()
  @IsOptional()
  driveUrl?: string;
}
