import { IsInt, Max, Min } from 'class-validator';

export class UpdateNilaiSubmisiDto {
  @IsInt({ message: 'Nilai wajib berupa bilangan bulat (tidak boleh koma)' })
  @Min(0)
  @Max(100)
  nilai: number;
}
