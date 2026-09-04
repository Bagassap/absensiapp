import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateGuruDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  nama?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Login ID tidak boleh kosong' })
  loginId?: string;

  @IsOptional()
  @IsString()
  nip?: string;

  @IsOptional()
  @IsString()
  noWa?: string;
}
