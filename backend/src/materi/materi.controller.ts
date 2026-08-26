import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { MateriService } from './materi.service';
import { CreateMateriDto } from './dto/create-materi.dto';
import { UpdateMateriDto } from './dto/update-materi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { documentUploadOptions } from '../common/upload/file-filters';
import { Role } from '../../generated/prisma/client';

const materiStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'materi');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@UseGuards(JwtAuthGuard)
@Controller('materi')
export class MateriController {
  constructor(private readonly service: MateriService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll({ id: req.user.id, role: req.user.role });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, { id: req.user.id, role: req.user.role });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: materiStorage, ...documentUploadOptions }))
  create(@Body() dto: CreateMateriDto, @UploadedFile() file: Express.Multer.File | undefined, @Request() req: any) {
    const fileUrl = file ? `/uploads/materi/${file.filename}` : undefined;
    const fileName = file ? file.originalname : undefined;
    return this.service.create(dto, fileUrl, fileName, { id: req.user.id, role: req.user.role });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Put(':id')
  @UseInterceptors(FileInterceptor('file', { storage: materiStorage, ...documentUploadOptions }))
  update(@Param('id') id: string, @Body() dto: UpdateMateriDto, @UploadedFile() file: Express.Multer.File | undefined, @Request() req: any) {
    const fileUrl = file ? `/uploads/materi/${file.filename}` : undefined;
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
