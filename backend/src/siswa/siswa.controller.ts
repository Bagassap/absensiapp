import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SiswaService } from './siswa.service';
import { SiswaPdfService } from './siswa-pdf.service';
import { SiswaExcelService } from './siswa-excel.service';
import { UpdateSiswaDto } from './dto/update-siswa.dto';
import { UpdateProfilSiswaDto } from './dto/update-profil-siswa.dto';
import { LengkapiProfilSiswaDto } from './dto/lengkapi-profil-siswa.dto';
import { NaikkanKelasDto } from './dto/naikkan-kelas.dto';
import { LuluskanKelasDto } from './dto/luluskan-kelas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Data';
}

@UseGuards(JwtAuthGuard)
@Controller('siswa')
export class SiswaController {
  constructor(
    private readonly service: SiswaService,
    private readonly pdfService: SiswaPdfService,
    private readonly excelService: SiswaExcelService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('saya')
  findMine(@Request() req: any) {
    return this.service.findMine(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Put('saya')
  updateMine(@Request() req: any, @Body() dto: UpdateProfilSiswaDto) {
    return this.service.updateMine(req.user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Patch('lengkapi-profil')
  lengkapiProfil(@Request() req: any, @Body() dto: LengkapiProfilSiswaDto) {
    return this.service.lengkapiProfil(req.user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get()
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('kelasId') kelasId?: string,
    @Query('jurusan') jurusan?: string,
    @Query('jenisKelamin') jenisKelamin?: string,
  ) {
    return this.service.findAll({ search, kelasId, jurusan, jenisKelamin }, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('export-pdf')
  async exportPdf(
    @Query('kelasId') kelasId: string,
    @Query('jurusan') jurusan: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const groups = await this.service.getSiswaForExport(kelasId || undefined, jurusan || undefined, req.user);
    const buffer = await this.pdfService.build(groups);
    const filename =
      kelasId && groups[0]
        ? `Data_Siswa_${sanitizeFilenamePart(groups[0].kelas.nama)}.pdf`
        : jurusan
          ? `Data_Siswa_${sanitizeFilenamePart(jurusan)}.pdf`
          : 'Data_Siswa_Semua_Kelas.pdf';

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
    @Query('jurusan') jurusan: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const groups = await this.service.getSiswaForExport(kelasId || undefined, jurusan || undefined, req.user);
    const buffer = await this.excelService.build(groups);
    const filename =
      kelasId && groups[0]
        ? `Data_Siswa_${sanitizeFilenamePart(groups[0].kelas.nama)}.xlsx`
        : jurusan
          ? `Data_Siswa_${sanitizeFilenamePart(jurusan)}.xlsx`
          : 'Data_Siswa_Semua_Kelas.xlsx';

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('naikkan-kelas')
  naikkanKelas(@Body() dto: NaikkanKelasDto) {
    return this.service.naikkanKelas(dto.dariKelasId, dto.keKelasId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('luluskan-kelas')
  luluskanKelas(@Body() dto: LuluskanKelasDto) {
    return this.service.luluskanKelas(dto.kelasId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSiswaDto) {
    return this.service.update(id, dto);
  }
}
