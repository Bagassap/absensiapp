import { IsString, IsNotEmpty } from 'class-validator';

export class NaikkanKelasDto {
  @IsString()
  @IsNotEmpty({ message: 'Kelas asal wajib dipilih' })
  dariKelasId: string;

  @IsString()
  @IsNotEmpty({ message: 'Kelas tujuan wajib dipilih' })
  keKelasId: string;
}
