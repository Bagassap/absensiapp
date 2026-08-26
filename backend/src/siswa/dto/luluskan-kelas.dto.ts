import { IsString, IsNotEmpty } from 'class-validator';

export class LuluskanKelasDto {
  @IsString()
  @IsNotEmpty({ message: 'Kelas wajib dipilih' })
  kelasId: string;
}
