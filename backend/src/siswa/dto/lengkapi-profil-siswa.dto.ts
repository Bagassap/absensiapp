import { IsDateString, IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

export class LengkapiProfilSiswaDto {
  @IsString()
  @IsNotEmpty({ message: 'Tempat lahir wajib diisi' })
  tempatLahir: string;

  @IsDateString({}, { message: 'Tanggal lahir tidak valid' })
  tanggalLahir: string;

  @IsIn(['Laki-laki', 'Perempuan'], { message: 'Jenis kelamin wajib dipilih' })
  jenisKelamin: string;

  @Matches(PHONE_REGEX, { message: 'Format nomor HP/WhatsApp tidak valid' })
  noHp: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama wali murid/orang tua wajib diisi' })
  namaOrtu: string;

  @IsString()
  @IsNotEmpty({ message: 'Dukuh/Dusun wajib diisi' })
  dukuh: string;

  @IsString()
  @IsNotEmpty({ message: 'RT wajib diisi' })
  rt: string;

  @IsString()
  @IsNotEmpty({ message: 'RW wajib diisi' })
  rw: string;

  @IsString()
  @IsNotEmpty({ message: 'Desa/Kelurahan wajib diisi' })
  desa: string;

  @IsString()
  @IsNotEmpty({ message: 'Kecamatan wajib diisi' })
  kecamatan: string;

  @IsString()
  @IsNotEmpty({ message: 'Kabupaten/Kota wajib diisi' })
  kabupaten: string;
}
