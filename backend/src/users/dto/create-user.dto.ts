import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateUserDto {
  @IsIn(['ADMIN', 'GURU', 'SISWA'])
  role: 'ADMIN' | 'GURU' | 'SISWA';

  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  nama: string;

  // ADMIN & GURU login with a loginId + admin-chosen password.
  @ValidateIf((o) => o.role !== 'SISWA')
  @IsString()
  @IsNotEmpty({ message: 'Login ID tidak boleh kosong' })
  loginId?: string;

  @ValidateIf((o) => o.role !== 'SISWA')
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

  // SISWA logs in with NIS (password defaults to NIS, forced change on first login).
  @ValidateIf((o) => o.role === 'SISWA')
  @IsString()
  @IsNotEmpty({ message: 'NIS tidak boleh kosong' })
  nis?: string;

  @ValidateIf((o) => o.role === 'SISWA')
  @IsString()
  @IsNotEmpty({ message: 'Kelas tidak boleh kosong' })
  kelasId?: string;

  @ValidateIf((o) => o.role === 'SISWA')
  @IsString()
  @IsNotEmpty({ message: 'Jurusan tidak boleh kosong' })
  jurusan?: string;

  @ValidateIf((o) => o.role === 'SISWA')
  @IsInt()
  angkatan?: number;

  @IsOptional()
  @IsString()
  jenisKelamin?: string;
}
