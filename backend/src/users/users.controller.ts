import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
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

@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  createAccount(@Body() dto: CreateUserDto) {
    return this.service.createAccount(dto);
  }

  @Get('password-status')
  findPasswordStatus() {
    return this.service.findPasswordStatus();
  }

  @Get('guru')
  findGuruList() {
    return this.service.findGuruList();
  }

  @Patch('guru/:id/nonaktifkan')
  deactivateGuru(@Param('id') id: string) {
    return this.service.deactivateGuru(id);
  }

  @Patch('guru/:id/aktifkan')
  activateGuru(@Param('id') id: string) {
    return this.service.activateGuru(id);
  }

  @Patch('guru/:id')
  updateGuru(@Param('id') id: string, @Body() dto: UpdateGuruDto) {
    return this.service.updateGuru(id, dto);
  }

  @Patch('guru/:id/foto')
  @UseInterceptors(FileInterceptor('foto', { storage: fotoProfilStorage, ...imageUploadOptions }))
  async setGuruFoto(@Param('id') id: string, @UploadedFile() foto?: Express.Multer.File) {
    if (!foto) throw new BadRequestException('Foto wajib diunggah');
    await compressProfilePhotoInPlace(foto.path);
    const fotoUrl = `/uploads/foto-profil/${foto.filename}`;
    return this.service.setGuruFoto(id, fotoUrl);
  }

  @Get('password-reset-requests')
  findPasswordResetRequests() {
    return this.service.findPasswordResetRequests();
  }

  @Patch('password-reset-requests/:id/complete')
  completePasswordResetRequest(@Param('id') id: string, @Request() req: any) {
    return this.service.completePasswordResetRequest(id, req.user.id);
  }
}
