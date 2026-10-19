import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request, Res, UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { AbsensiHarianService } from './absensi-harian.service';
import { AbsensiHarianPdfService } from './absensi-harian-pdf.service';
import { AbsensiHarianExcelService } from './absensi-harian-excel.service';
import {
  CreateKegiatanDto, UpdateKegiatanDto, AbsenKegiatanDto, KirimPengingatDto, VerifikasiAbsensiDto,
  CreateKegiatanRecurringDto, UpdateKegiatanRecurringDto,
} from './dto/absensi-harian.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { imageUploadOptions } from '../common/upload/file-filters';
import { compressUploadedImageInPlace } from '../common/upload/compress-image.util';
import { Role } from '../../generated/prisma/client';
import { todayJakarta as todayStr } from '../common/utils/jakarta-date.util';

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
}

const absensiHarianStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'absensi-harian');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard)
@Controller('absensi-harian')
export class AbsensiHarianController {
  constructor(
    private readonly service: AbsensiHarianService,
    private readonly pdfService: AbsensiHarianPdfService,
    private readonly excelService: AbsensiHarianExcelService,
  ) {}

  private parseExportMode(mode?: string): 'harian' | 'mingguan' | 'bulanan' {
    if (mode === 'mingguan' || mode === 'bulanan') return mode;
    return 'harian';
  }


  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('kegiatan')
  listKegiatan(@Query('tanggal') tanggal: string) {
    return this.service.listKegiatan(tanggal || todayStr());
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('kegiatan')
  createKegiatan(@Body() dto: CreateKegiatanDto, @Request() req: any) {
    return this.service.createKegiatan(dto, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('kegiatan/:id')
  updateKegiatan(@Param('id') id: string, @Body() dto: UpdateKegiatanDto) {
    return this.service.updateKegiatan(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('kegiatan/:id')
  deleteKegiatan(@Param('id') id: string) {
    return this.service.deleteKegiatan(id);
  }


  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('kegiatan-recurring')
  listKegiatanRecurring() {
    return this.service.listKegiatanRecurring();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('kegiatan-recurring')
  createKegiatanRecurring(@Body() dto: CreateKegiatanRecurringDto, @Request() req: any) {
    return this.service.createKegiatanRecurring(dto, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('kegiatan-recurring/:id')
  updateKegiatanRecurring(@Param('id') id: string, @Body() dto: UpdateKegiatanRecurringDto) {
    return this.service.updateKegiatanRecurring(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('kegiatan-recurring/:id')
  deleteKegiatanRecurring(@Param('id') id: string) {
    return this.service.deleteKegiatanRecurring(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('dhuha')
  getDhuhaInfo(@Query('tanggal') tanggal: string) {
    return this.service.getDhuhaInfo(tanggal || todayStr());
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('dhuha/anchor')
  setDhuhaAnchor(@Body('tanggal') tanggal: string) {
    return this.service.setDhuhaAnchor(tanggal);
  }


  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('saya')
  getStatusSaya(@Query('tanggal') tanggal: string, @Request() req: any) {
    return this.service.getStatusSaya(req.user.id, tanggal);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Post('saya')
  @UseInterceptors(FileInterceptor('foto', { storage: absensiHarianStorage, ...imageUploadOptions }))
  async absenSendiri(
    @Body() dto: AbsenKegiatanDto,
    @Request() req: any,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    if (foto) await compressUploadedImageInPlace(foto.path);
    const fotoUrl = foto ? `/uploads/absensi-harian/${foto.filename}` : undefined;
    return this.service.absenKegiatan(req.user.id, dto.kegiatanId, {
      lokasi: dto.lokasi,
      ttd: dto.ttd,
      fotoUrl,
      status: dto.status,
    });
  }


  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  getRekap(@Query('tanggal') tanggal: string) {
    return this.service.getRekapKegiatan(tanggal || todayStr());
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/verifikasi')
  toggleVerifikasi(@Param('id') id: string, @Body() dto: VerifikasiAbsensiDto, @Request() req: any) {
    return this.service.toggleVerifikasi(id, req.user.id, dto.catatan);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteAbsensi(@Param('id') id: string) {
    return this.service.deleteAbsensi(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('laporan-rendah-kehadiran')
  getLaporanRendahKehadiran(@Query('periode') periode: string) {
    const p = periode === 'bulanan' ? 'bulanan' : 'mingguan';
    return this.service.getLaporanRendahKehadiran(p);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('kirim-pengingat')
  kirimPengingat(@Body() dto: KirimPengingatDto) {
    return this.service.kirimPengingatBelumAbsen(dto.kegiatanId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('ttd-image')
  async ttdImage(@Query('id') id: string, @Res() res: Response) {
    if (!id) throw new BadRequestException('id wajib diisi');
    const result = await this.service.getTtdImage(id);
    if (!result) throw new NotFoundException('Tanda tangan tidak tersedia');
    res.set({ 'Content-Type': result.mime, 'Cache-Control': 'private, max-age=60' });
    res.send(result.buffer);
  }


  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('export-guru-roster')
  getExportGuruRoster() {
    return this.service.getExportGuruRoster();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('export-pdf')
  async exportPdf(
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Res() res: Response,
  ) {
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getRekapForExport(tanggal || todayStr());
      buffer = await this.pdfService.build(rekap);
      filename = `Absensi_Kegiatan_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getRekapRangeForExport(mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(rekap);
      filename = `Absensi_Kegiatan_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${sanitizeFilenamePart(rekap.tanggalMulai)}.pdf`;
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('export-pdf-guru')
  async exportPdfGuru(
    @Query('guruId') guruId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Res() res: Response,
  ) {
    if (!guruId) throw new BadRequestException('guruId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getGuruAbsensiForExport(guruId, tanggal || todayStr());
      buffer = await this.pdfService.buildGuru(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guruNama ?? 'Guru')}_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getGuruAbsensiRangeForExport(guruId, mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildGuruRange(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guruNama ?? 'Guru')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${sanitizeFilenamePart(rekap.tanggalMulai)}.pdf`;
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('export-excel')
  async exportExcel(
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Res() res: Response,
  ) {
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getRekapForExport(tanggal || todayStr());
      buffer = await this.excelService.build(rekap);
      filename = `Absensi_Kegiatan_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getRekapRangeForExport(mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(rekap);
      filename = `Absensi_Kegiatan_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${sanitizeFilenamePart(rekap.tanggalMulai)}.xlsx`;
    }
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('export-excel-guru')
  async exportExcelGuru(
    @Query('guruId') guruId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Res() res: Response,
  ) {
    if (!guruId) throw new BadRequestException('guruId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getGuruAbsensiForExport(guruId, tanggal || todayStr());
      buffer = await this.excelService.buildGuru(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guruNama ?? 'Guru')}_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getGuruAbsensiRangeForExport(guruId, mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildGuruRange(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guruNama ?? 'Guru')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${sanitizeFilenamePart(rekap.tanggalMulai)}.xlsx`;
    }
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.send(buffer);
  }
}
