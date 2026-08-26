import {
  Controller, Get, Post, Query, Body, UseGuards, Request, Res, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { AbsensiMagangService } from './absensi-magang.service';
import { AbsensiHarianPdfService } from '../absensi-harian/absensi-harian-pdf.service';
import { AbsensiHarianExcelService } from '../absensi-harian/absensi-harian-excel.service';
import { AbsenSendiriMagangDto, UpsertAbsensiMagangDto } from './dto/absensi-magang.dto';
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

const absensiMagangStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'absensi-magang');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

const PDF_TITLE = 'LAPORAN ABSENSI PKL';
const ENTITY_LABEL = 'Tempat PKL';
const EMPTY_MESSAGE = 'Tidak ada siswa PKL di tempat ini.';

@UseGuards(JwtAuthGuard)
@Controller('magang/absensi')
export class AbsensiMagangController {
  constructor(
    private readonly service: AbsensiMagangService,
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
    @Query('tempatMagangId') tempatMagangId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!tempatMagangId) throw new BadRequestException('tempatMagangId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getRekapTempatForExport(tempatMagangId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.pdfService.build(
        { kelas: { nama: rekap.tempatMagang.namaTempat }, tanggal: rekap.tanggal, siswa: rekap.siswa },
        { title: PDF_TITLE, entityLabel: ENTITY_LABEL, emptyMessage: EMPTY_MESSAGE },
      );
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.tempatMagang.namaTempat)}_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getRekapTempatRangeForExport(tempatMagangId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(
        { kelas: rekap.tempatMagang ? { nama: rekap.tempatMagang.namaTempat } : null, tanggalMulai: rekap.tanggalMulai, tanggalSelesai: rekap.tanggalSelesai, tanggalList: rekap.tanggalList, siswa: rekap.siswa },
        { entityLabel: ENTITY_LABEL, emptyMessage: EMPTY_MESSAGE },
      );
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.tempatMagang?.namaTempat ?? 'Tempat')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU, Role.SISWA)
  @Get('export-pdf-siswa')
  async exportPdfSiswa(
    @Query('siswaId') siswaIdQ: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Siswa tidak pernah dipercaya mengirim siswaId sendiri — selalu
    // diturunkan dari token JWT-nya, bukan dari query string.
    const siswaId = req.user.role === 'SISWA' ? await this.service.resolveOwnSiswaId(req.user.id) : siswaIdQ;
    if (!siswaId) throw new BadRequestException('siswaId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getSiswaAbsensiForExport(siswaId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.pdfService.build(
        { kelas: rekap.tempatMagang ? { nama: rekap.tempatMagang.namaTempat } : null, tanggal: rekap.tanggal, siswa: rekap.siswa },
        { title: PDF_TITLE, entityLabel: ENTITY_LABEL, emptyMessage: EMPTY_MESSAGE },
      );
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${sanitizeFilenamePart(rekap.tanggal)}.pdf`;
    } else {
      const rekap = await this.service.getSiswaAbsensiRangeForExport(siswaId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.pdfService.buildRange(
        { kelas: rekap.tempatMagang ? { nama: rekap.tempatMagang.namaTempat } : null, tanggalMulai: rekap.tanggalMulai, tanggalSelesai: rekap.tanggalSelesai, tanggalList: rekap.tanggalList, siswa: rekap.siswa },
        { entityLabel: ENTITY_LABEL, emptyMessage: EMPTY_MESSAGE },
      );
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.pdf`;
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
    @Query('tempatMagangId') tempatMagangId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    if (!tempatMagangId) throw new BadRequestException('tempatMagangId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getRekapTempatForExport(tempatMagangId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.excelService.build({ kelas: { nama: rekap.tempatMagang.namaTempat }, tanggal: rekap.tanggal, siswa: rekap.siswa });
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.tempatMagang.namaTempat)}_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getRekapTempatRangeForExport(tempatMagangId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(
        { kelas: rekap.tempatMagang ? { nama: rekap.tempatMagang.namaTempat } : null, tanggalMulai: rekap.tanggalMulai, tanggalSelesai: rekap.tanggalSelesai, tanggalList: rekap.tanggalList, siswa: rekap.siswa },
        'kelas',
      );
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.tempatMagang?.namaTempat ?? 'Tempat')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.xlsx`;
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU, Role.SISWA)
  @Get('export-excel-siswa')
  async exportExcelSiswa(
    @Query('siswaId') siswaIdQ: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const siswaId = req.user.role === 'SISWA' ? await this.service.resolveOwnSiswaId(req.user.id) : siswaIdQ;
    if (!siswaId) throw new BadRequestException('siswaId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    let buffer: Buffer;
    let filename: string;
    if (mode === 'harian') {
      const rekap = await this.service.getSiswaAbsensiForExport(siswaId, tanggal || todayStr(), req.user.id, req.user.role);
      buffer = await this.excelService.build({ kelas: rekap.tempatMagang ? { nama: rekap.tempatMagang.namaTempat } : null, tanggal: rekap.tanggal, siswa: rekap.siswa });
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${sanitizeFilenamePart(rekap.tanggal)}.xlsx`;
    } else {
      const rekap = await this.service.getSiswaAbsensiRangeForExport(siswaId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
      buffer = await this.excelService.buildRange(
        { kelas: rekap.tempatMagang ? { nama: rekap.tempatMagang.namaTempat } : null, tanggalMulai: rekap.tanggalMulai, tanggalSelesai: rekap.tanggalSelesai, tanggalList: rekap.tanggalList, siswa: rekap.siswa },
        'siswa',
      );
      filename = `AbsensiPKL_${sanitizeFilenamePart(rekap.siswa[0]?.nama ?? 'Siswa')}_${mode === 'bulanan' ? 'Bulanan' : 'Mingguan'}_${this.rangeFilenamePart(mode, rekap)}.xlsx`;
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // Data JSON di balik export-pdf/export-excel di atas, dipakai halaman
  // Rekap & Laporan untuk menampilkan tabel rekap sebelum diunduh.
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('rekap')
  async getRekap(
    @Query('tempatMagangId') tempatMagangId: string,
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
  ) {
    if (!tempatMagangId) throw new BadRequestException('tempatMagangId wajib diisi');
    const mode = this.parseExportMode(modeQ);
    if (mode === 'harian') {
      return this.service.getRekapTempatForExport(tempatMagangId, tanggal || todayStr(), req.user.id, req.user.role);
    }
    return this.service.getRekapTempatRangeForExport(tempatMagangId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('saya/rekap')
  async getRekapSaya(
    @Query('tanggal') tanggal: string,
    @Query('mode') modeQ: string,
    @Query('tanggalMulai') tanggalMulai: string,
    @Query('tanggalSelesai') tanggalSelesai: string,
    @Query('bulan') bulan: string,
    @Query('tahun') tahun: string,
    @Request() req: any,
  ) {
    const siswaId = await this.service.resolveOwnSiswaId(req.user.id);
    const mode = this.parseExportMode(modeQ);
    if (mode === 'harian') {
      return this.service.getSiswaAbsensiForExport(siswaId, tanggal || todayStr(), req.user.id, req.user.role);
    }
    return this.service.getSiswaAbsensiRangeForExport(siswaId, mode, req.user.id, req.user.role, { tanggalMulai, tanggalSelesai, bulan, tahun });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get()
  getAbsensi(
    @Query('tanggal') tanggal: string,
    @Query('tempatMagangId') tempatMagangId: string,
    @Request() req: any,
  ) {
    return this.service.getForActor(req.user.id, req.user.role, tanggal || todayStr(), tempatMagangId || undefined);
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
  @UseInterceptors(FileInterceptor('foto', { storage: absensiMagangStorage, ...imageUploadOptions }))
  async absenSendiri(
    @Body() dto: AbsenSendiriMagangDto,
    @Request() req: any,
    @UploadedFile() foto?: Express.Multer.File,
  ) {
    if (foto) await compressUploadedImageInPlace(foto.path);
    const fotoUrl = foto ? `/uploads/absensi-magang/${foto.filename}` : undefined;
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
  upsertAbsensi(@Body() dto: UpsertAbsensiMagangDto, @Request() req: any) {
    return this.service.upsertAbsensi(dto.tempatMagangId, dto.tanggal, dto.absensi, req.user.id, req.user.role);
  }
}
