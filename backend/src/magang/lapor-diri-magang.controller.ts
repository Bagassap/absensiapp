import {
  Controller, Get, Post, Query, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { LaporDiriMagangService } from './lapor-diri-magang.service';
import { SubmitLaporDiriDto } from './dto/lapor-diri-magang.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { documentUploadOptions } from '../common/upload/file-filters';
import { Role } from '../../generated/prisma/client';

const laporDiriStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'lapor-diri-magang');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard)
@Controller('magang/lapor-diri')
export class LaporDiriMagangController {
  constructor(private readonly service: LaporDiriMagangService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get()
  getForActor(
    @Query('periode') periode: string,
    @Query('tempatMagangId') tempatMagangId: string,
    @Request() req: any,
  ) {
    return this.service.getForActor(req.user.id, req.user.role, periode || undefined, tempatMagangId || undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('saya')
  getStatusSaya(@Request() req: any) {
    return this.service.getStatusSaya(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post('saya')
  @UseInterceptors(FileInterceptor('file', { storage: laporDiriStorage, ...documentUploadOptions }))
  async submit(
    @Body() dto: SubmitLaporDiriDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('File laporan (PDF/PPT) wajib diunggah');
    const fileUrl = `/uploads/lapor-diri-magang/${file.filename}`;
    return this.service.submit(req.user.id, dto.catatan, fileUrl, file.originalname);
  }
}
