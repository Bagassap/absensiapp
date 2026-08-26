import {
  Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Request, Res, UseInterceptors, UploadedFile,
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
import { AbsenSendiriHarianDto, UpsertAbsensiHarianDto, UpsertJadwalOverrideDto, KirimPengingatDto } from './dto/absensi-harian.dto';
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

  private rangeFilenamePart(mode: 'mingguan' | 'bulanan', rekap: { tanggalMulai: string; tanggalSelesai: string }): string {
    return mode === 'bulanan'
      ? sanitizeFilenamePart(rekap.tanggalMulai.slice(0, 7))
      : `${sanitizeFilenamePart(rekap.tanggalMulai)}_${sanitizeFilenamePart(rekap.tanggalSelesai)}`;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('export-pdf')
  async exportPdf(
    @Query('kelasId') kelasId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!kelasId) {
      throw new BadRequestException('kelasId wajib diisi');
    }
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getRekapKelasForExport(kelasId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.pdfService.build(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.kelas?.nama ?? 'Kelas')}_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getRekapKelasRangeForExport(kelasId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.kelas?.nama ?? 'Kelas')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('export-pdf-siswa')
  async exportPdfSiswa(
    @Query('siswaId') siswaId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!siswaId) throw new BadRequestException('siswaId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getSiswaAbsensiForExport(siswaId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.pdfService.build(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getSiswaAbsensiRangeForExport(siswaId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('export-excel')
  async exportExcel(
    @Query('kelasId') kelasId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!kelasId) throw new BadRequestException('kelasId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getRekapKelasForExport(kelasId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.excelService.build(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.kelas?.nama ?? 'Kelas')}_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getRekapKelasRangeForExport(kelasId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(rekap, 'kelas');
      filename = `Absensi_${sanitizeFilenamePart(rekap.kelas?.nama ?? 'Kelas')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.xlsx`;
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('export-excel-siswa')
  async exportExcelSiswa(
    @Query('siswaId') siswaId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!siswaId) throw new BadRequestException('siswaId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getSiswaAbsensiForExport(siswaId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.excelService.build(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getSiswaAbsensiRangeForExport(siswaId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(rekap, 'siswa');
      filename = `Absensi_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.xlsx`;
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('ttd-image')
  async ttdImage(
    @Query('siswaId') siswaId: string,
    @Query('tanggal') tanggal: string,
    @Query('tipe') tipe: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!siswaId || !tanggal) throw new BadRequestException('siswaId dan tanggal wajib diisi');
    const result = await this.service.getTtdImage(
      siswaId,
      tanggal,
      tipe === 'pulang' ? 'pulang' : 'hadir',
      req.user.id,
      req.user.role,
    );
    if (!result) throw new NotFoundException('Tanda tangan tidak tersedia');
    res.set({ 'Content-Type': result.mime, 'Cache-Control': 'private, max-age=60' });
    res.send(result.buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('jadwal-override/hari-ini')
  getJadwalHariIni() {
    return this.service.getJadwalHariIni();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('jadwal-override')
  listJadwalOverride() {
    return this.service.listJadwalOverride();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('jadwal-override')
  upsertJadwalOverride(@Body() dto: UpsertJadwalOverrideDto, @Request() req: any) {
    return this.service.upsertJadwalOverride(
      dto.tanggal,
      {
        hadirStartMinutes: dto.hadirStartMinutes,
        hadirEndMinutes: dto.hadirEndMinutes,
        pulangStartMinutes: dto.pulangStartMinutes,
        pulangEndMinutes: dto.pulangEndMinutes,
        keterangan: dto.keterangan,
      },
      req.user.id,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('jadwal-override/:tanggal')
  deleteJadwalOverride(@Param('tanggal') tanggal: string) {
    return this.service.deleteJadwalOverride(tanggal);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('laporan-sering-tidak-hadir')
  getLaporanSeringTidakHadir(
    @Query('periode') periode: string,
    @Query('kelasId') kelasId: string,
    @Request() req: any,
  ) {
    const p = periode === 'bulanan' ? 'bulanan' : 'mingguan';
    return this.service.getLaporanSeringTidakHadir(req.user.id, req.user.role, p, kelasId || undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get()
  getAbsensi(
    @Query('tanggal') tanggal: string,
    @Query('kelasId') kelasId: string,
    @Request() req: any,
  ) {
    return this.service.getForActor(req.user.id, req.user.role, tanggal || todayStr(), kelasId || undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('saya')
  getStatusSaya(@Query('tanggal') tanggal: string, @Request() req: any) {
    return this.service.getStatusSaya(req.user.id, tanggal);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post('saya')
  @UseInterceptors(FileInterceptor('foto', { storage: absensiHarianStorage, ...imageUploadOptions }))
  async absenSendiri(
    @Body() dto: AbsenSendiriHarianDto,
    @Request() req: any,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    if (foto) await compressUploadedImageInPlace(foto.path);
    const fotoUrl = foto ? `/uploads/absensi-harian/${foto.filename}` : undefined;
    return this.service.absenSendiri(req.user.id, dto.tipe ?? 'HADIR', {
      lokasi: dto.lokasi,
      waktuAbsen: dto.waktuAbsen,
      ttd: dto.ttd,
      catatan: dto.catatan,
      fotoUrl,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Post()
  upsertAbsensi(@Body() dto: UpsertAbsensiHarianDto, @Request() req: any) {
    return this.service.upsertAbsensi(dto.kelasId, dto.tanggal, dto.absensi, req.user.id, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Post('kirim-pengingat')
  kirimPengingat(@Body() dto: KirimPengingatDto, @Request() req: any) {
    return this.service.kirimPengingatBelumAbsen(dto.kelasId, dto.tanggal, req.user.id, req.user.role);
  }
}
