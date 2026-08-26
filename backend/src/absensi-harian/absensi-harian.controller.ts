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
import { AbsenSendiriHarianDto, UpsertJadwalOverrideDto, KirimPengingatDto } from './dto/absensi-harian.dto';
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

  // Export rekap SEMUA guru (admin memantau seluruh sekolah).
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
      const rekap = await this.service.getRekapSemuaGuruForExport(tanggal || todayStr());
      buffer = await this.pdfService.build(rekap);
      filename = `Absensi_Guru_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getRekapSemuaGuruRangeForExport(mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(rekap);
      filename = `Absensi_Guru_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // Export rekap SATU guru (admin lihat detail 1 orang).
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
      buffer = await this.pdfService.build(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guru[0]?.nama ?? 'Guru')}_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getGuruAbsensiRangeForExport(guruId, mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guru[0]?.nama ?? 'Guru')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
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
      const rekap = await this.service.getRekapSemuaGuruForExport(tanggal || todayStr());
      buffer = await this.excelService.build(rekap);
      filename = `Absensi_Guru_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getRekapSemuaGuruRangeForExport(mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(rekap, 'kelas');
      filename = `Absensi_Guru_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.xlsx`;
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
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
      buffer = await this.excelService.build(rekap);
      filename = `Absensi_${sanitizeFilenamePart(rekap.guru[0]?.nama ?? 'Guru')}_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getGuruAbsensiRangeForExport(guruId, mode, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(rekap, 'siswa');
      filename = `Absensi_${sanitizeFilenamePart(rekap.guru[0]?.nama ?? 'Guru')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.xlsx`;
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('ttd-image')
  async ttdImage(
    @Query('guruId') guruId: string,
    @Query('tanggal') tanggal: string,
    @Query('tipe') tipe: string,
    @Res() res: Response,
  ) {
    if (!guruId || !tanggal) throw new BadRequestException('guruId dan tanggal wajib diisi');
    const result = await this.service.getTtdImage(guruId, tanggal, tipe === 'pulang' ? 'pulang' : 'hadir');
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
  @Roles(Role.ADMIN)
  @Get('laporan-sering-tidak-hadir')
  getLaporanSeringTidakHadir(@Query('periode') periode: string) {
    const p = periode === 'bulanan' ? 'bulanan' : 'mingguan';
    return this.service.getLaporanSeringTidakHadir(p);
  }

  // ADMIN: rekap semua guru untuk tanggal tertentu (read-only monitor).
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  getAbsensi(@Query('tanggal') tanggal: string) {
    return this.service.getForActor('', 'ADMIN', tanggal || todayStr());
  }

  // GURU: status absensi diri sendiri.
  @UseGuards(RolesGuard)
  @Roles(Role.GURU)
  @Get('saya')
  getStatusSaya(@Query('tanggal') tanggal: string, @Request() req: any) {
    return this.service.getStatusSaya(req.user.id, tanggal);
  }

  // GURU: check-in/check-out sendiri.
  @UseGuards(RolesGuard)
  @Roles(Role.GURU)
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

  // ADMIN: kirim pengingat in-app ke guru yang belum absen pada tanggal ini.
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('kirim-pengingat')
  kirimPengingat(@Body() dto: KirimPengingatDto) {
    return this.service.kirimPengingatBelumAbsen(dto.tanggal);
  }
}
