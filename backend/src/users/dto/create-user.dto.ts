import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateUserDto {
  @IsIn(['ADMIN', 'GURU'])
  role: 'ADMIN' | 'GURU';

  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  nama: string;

  @IsString()
  @IsNotEmpty({ message: 'Login ID tidak boleh kosong' })
  loginId?: string;

  @IsString()
  @MinLength(4, { message: 'Password minimal 4 karakter' })
  password?: string;

  @ValidateIf((o) => o.role === 'GURU')
  @IsOptional()
  @IsString()
  nip?: string;

  @IsOptional()
  @IsString()
  noWa?: string;

  @IsOptional()
  @IsString()
  jenisKelamin?: string;
}
