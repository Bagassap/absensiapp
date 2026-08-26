import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { imageUploadOptions } from '../common/upload/file-filters';
import { compressProfilePhotoInPlace } from '../common/upload/compress-image.util';

const fotoProfilStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'foto-profil');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  // Compression always normalizes the output to JPEG, so the stored
  // filename is forced to .jpg regardless of the uploaded extension.
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '.jpg');
  },
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const me = await this.authService.getMe(req.user.id);
    return { ...me, impersonatedBy: req.user.impersonatedBy ?? null };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('foto-profil')
  @UseInterceptors(FileInterceptor('foto', { storage: fotoProfilStorage, ...imageUploadOptions }))
  async setFotoProfil(@Request() req: any, @UploadedFile() foto?: Express.Multer.File) {
    if (!foto) throw new BadRequestException('Foto wajib diunggah');
    await compressProfilePhotoInPlace(foto.path);
    const fotoUrl = `/uploads/foto-profil/${foto.filename}`;
    return this.authService.setFotoProfil(req.user.id, fotoUrl);
  }
}
