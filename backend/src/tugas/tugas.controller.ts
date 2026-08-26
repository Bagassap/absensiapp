import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { TugasService } from './tugas.service';
import { CreateTugasDto } from './dto/create-tugas.dto';
import { UpdateTugasDto } from './dto/update-tugas.dto';
import { SubmitTugasDto } from './dto/submit-tugas.dto';
import { SubmitPercobaanDto } from './dto/percobaan-tugas.dto';
import { UpdateNilaiSubmisiDto } from './dto/update-nilai-submisi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { documentUploadOptions } from '../common/upload/file-filters';
import { Role } from '../../generated/prisma/client';

function makeStorage(folder: string) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(process.cwd(), 'uploads', folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + extname(file.originalname));
    },
  });
}

const tugasStorage = makeStorage('tugas');
const submisiStorage = makeStorage('tugas-submisi');

@UseGuards(JwtAuthGuard)
@Controller('tugas')
export class TugasController {
  constructor(private readonly service: TugasService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('submisi')
  findAllSubmisi() {
    return this.service.findAllSubmisi();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('submisi/saya')
  findMySubmisi(@Request() req: any) {
    return this.service.findMySubmisi(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post('submisi')
  @UseInterceptors(FileInterceptor('file', { storage: submisiStorage, ...documentUploadOptions }))
  submitTugas(@Request() req: any, @Body() dto: SubmitTugasDto, @UploadedFile() file: Express.Multer.File | undefined) {
    const fileUrl = file ? `/uploads/tugas-submisi/${file.filename}` : undefined;
    const fileName = file ? file.originalname : undefined;
    return this.service.submitTugas(req.user.id, dto, fileUrl, fileName);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put('submisi/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'TERKIRIM' | 'DITERIMA' | 'REVISI',
    @Body('pesanRevisi') pesanRevisi?: string,
  ) {
    return this.service.updateStatusSubmisi(id, status, pesanRevisi);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put('submisi/:id/nilai')
  updateNilai(@Param('id') id: string, @Body() dto: UpdateNilaiSubmisiDto) {
    return this.service.updateNilaiSubmisi(id, dto.nilai);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put('submisi/:id/reset-percobaan')
  resetPercobaan(@Param('id') id: string, @Request() req: any) {
    return this.service.resetPercobaan(id, { id: req.user.id, role: req.user.role });
  }

  // Membuka lembar pengerjaan lockdown — mengonsumsi 1 percobaan.
  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post(':id/mulai-percobaan')
  mulaiPercobaan(@Param('id') id: string, @Request() req: any) {
    return this.service.mulaiPercobaan(req.user.id, id);
  }

  // Submit normal (klik "Selesai") dari lembar pengerjaan.
  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post(':id/submit-percobaan')
  submitPercobaan(@Param('id') id: string, @Body() dto: SubmitPercobaanDto, @Request() req: any) {
    return this.service.submitPercobaan(req.user.id, id, { ...dto, dipaksa: false });
  }

  // Submit paksa — dipanggil otomatis oleh frontend (sendBeacon/fetch
  // keepalive) begitu terdeteksi siswa meninggalkan halaman lembar
  // pengerjaan. Selalu dipaksa=true terlepas dari body yang dikirim klien.
  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Post(':id/paksa-keluar')
  paksaKeluar(@Param('id') id: string, @Body() dto: SubmitPercobaanDto, @Request() req: any) {
    return this.service.submitPercobaan(req.user.id, id, { ...dto, dipaksa: true });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll({ id: req.user.id, role: req.user.role });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get(':id/belum-mengumpulkan')
  findBelumMengumpulkan(@Param('id') id: string) {
    return this.service.findBelumMengumpulkan(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, { id: req.user.id, role: req.user.role });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: tugasStorage, ...documentUploadOptions }))
  create(@Body() dto: CreateTugasDto, @UploadedFile() file: Express.Multer.File | undefined, @Request() req: any) {
    const fileUrl = file ? `/uploads/tugas/${file.filename}` : undefined;
    const fileName = file ? file.originalname : undefined;
    return this.service.create(dto, fileUrl, fileName, { id: req.user.id, role: req.user.role });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put(':id')
  @UseInterceptors(FileInterceptor('file', { storage: tugasStorage, ...documentUploadOptions }))
  update(@Param('id') id: string, @Body() dto: UpdateTugasDto, @UploadedFile() file: Express.Multer.File | undefined, @Request() req: any) {
    const fileUrl = file ? `/uploads/tugas/${file.filename}` : undefined;
    const fileName = file ? file.originalname : undefined;
    return this.service.update(id, dto, fileUrl, fileName, { id: req.user.id, role: req.user.role });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, { id: req.user.id, role: req.user.role });
  }
}
