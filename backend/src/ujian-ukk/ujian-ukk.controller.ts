import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, Request, Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { UjianUkkService } from './ujian-ukk.service';
import { UjianUkkExcelService } from './ujian-ukk-excel.service';
import { CreateTahapanDto } from './dto/create-tahapan.dto';
import { CreateSoalDto } from './dto/create-soal.dto';
import { SubmitProjectDto } from './dto/submit-project.dto';
import { CreateDiskusiDto } from './dto/create-diskusi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { documentUploadOptions } from '../common/upload/file-filters';
import { Role } from '../../generated/prisma/client';

const soalStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'ukk-soal');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

const submitStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'ukk-submisi');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard)
@Controller('ujian-ukk')
export class UjianUkkController {
  constructor(
    private readonly service: UjianUkkService,
    private readonly excelService: UjianUkkExcelService,
  ) {}

  @Get('tahapan')
  findAllTahapan() { return this.service.findAllTahapan(); }

  @Get('tahapan/saya')
  findTahapanSaya(@Request() req: any) { return this.service.findTahapanSaya(req.user.sub); }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('tahapan')
  createTahapan(@Body() dto: CreateTahapanDto) { return this.service.createTahapan(dto); }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put('tahapan/:id')
  updateTahapan(@Param('id') id: string, @Body() dto: Partial<CreateTahapanDto>) {
    return this.service.updateTahapan(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('tahapan/:id')
  deleteTahapan(@Param('id') id: string) { return this.service.deleteTahapan(id); }

  @Get('soal')
  findAllSoal() { return this.service.findAllSoal(); }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Post('soal')
  @UseInterceptors(FileInterceptor('file', { storage: soalStorage, ...documentUploadOptions }))
  createSoal(@Body() dto: CreateSoalDto, @UploadedFile() file: Express.Multer.File) {
    const fileUrl  = `/uploads/ukk-soal/${file.filename}`;
    const fileName = file.originalname;
    return this.service.createSoal(dto, fileUrl, fileName);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Delete('soal/:id')
  deleteSoal(@Param('id') id: string) { return this.service.deleteSoal(id); }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('submisi')
  findAllSubmisi() { return this.service.findAllSubmisi(); }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('submisi/saya')
  findMySubmisi(@Request() req: any) { return this.service.findMySubmisi(req.user.id); }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post('submisi')
  @UseInterceptors(FileInterceptor('file', { storage: submitStorage, ...documentUploadOptions }))
  submitProject(
    @Request() req: any,
    @Body() dto: SubmitProjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const fileUrl  = file ? `/uploads/ukk-submisi/${file.filename}` : (dto.driveUrl ?? '');
    const fileName = file ? file.originalname : 'Google Drive';
    return this.service.submitProject(req.user.id, dto, fileUrl, fileName);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('submisi/export-excel')
  async exportSubmisiExcel(@Res() res: Response) {
    const groups = await this.service.getSubmisiForExport();
    const buffer = await this.excelService.build(groups);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Rekap_Submisi_UKK.xlsx"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put('submisi/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: 'TERKIRIM' | 'DITERIMA' | 'REVISI', @Body('pesanRevisi') pesanRevisi?: string) {
    return this.service.updateStatusSubmisi(id, status, pesanRevisi);
  }

  @Get('diskusi')
  findAllDiskusi() { return this.service.findAllDiskusi(); }

  @Post('diskusi')
  createDiskusi(@Request() req: any, @Body() dto: CreateDiskusiDto) {
    return this.service.createDiskusi(req.user.id, dto);
  }

  @Delete('diskusi/:id')
  deleteDiskusi(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteDiskusi(id, req.user.id, req.user.role);
  }
}
