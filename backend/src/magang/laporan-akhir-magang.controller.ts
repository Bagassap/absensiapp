import {
  Controller, Get, Post, Put, Query, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { LaporanAkhirMagangService } from './laporan-akhir-magang.service';
import { SubmitLaporanAkhirDto, UpdateStatusLaporanAkhirDto } from './dto/laporan-akhir-magang.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { documentUploadOptions } from '../common/upload/file-filters';
import { Role } from '../../generated/prisma/client';

const laporanAkhirStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'laporan-akhir-magang');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard)
@Controller('magang/laporan-akhir')
export class LaporanAkhirMagangController {
  constructor(private readonly service: LaporanAkhirMagangService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get()
  getForActor(@Query('tempatMagangId') tempatMagangId: string, @Request() req: any) {
    return this.service.getForActor(req.user.id, req.user.role, tempatMagangId || undefined);
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
  @UseInterceptors(FileInterceptor('file', { storage: laporanAkhirStorage, ...documentUploadOptions }))
  async submit(
    @Body() dto: SubmitLaporanAkhirDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('File laporan (PDF/Word/PPT) wajib diunggah');
    const fileUrl = `/uploads/laporan-akhir-magang/${file.filename}`;
    return this.service.submit(req.user.id, dto.catatan, fileUrl, file.originalname);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put(':penempatanId/status')
  updateStatus(
    @Param('penempatanId') penempatanId: string,
    @Body() dto: UpdateStatusLaporanAkhirDto,
    @Request() req: any,
  ) {
    return this.service.updateStatus(penempatanId, dto.status, dto.pesanRevisi, req.user.id, req.user.role);
  }
}
