import { IsString, MinLength } from 'class-validator';

export class AddMapelDto {
  @IsString()
  @MinLength(1)
  nama!: string;
}
