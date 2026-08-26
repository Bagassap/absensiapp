import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PengumumanService } from './pengumuman.service';
import { CreatePengumumanDto } from './dto/create-pengumuman.dto';
import { UpdatePengumumanDto } from './dto/update-pengumuman.dto';
import { CreateKomentarDto } from './dto/create-komentar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('pengumuman')
export class PengumumanController {
  constructor(private readonly service: PengumumanService) {}

  @Get()
  findAll(
    @Query('kategori') kategori?: string,
    @Query('search') search?: string,
    @Query('pinned') pinned?: string,
  ) {
    return this.service.findAll(kategori, search, pinned);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePengumumanDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Delete('komentar/:komentarId')
  deleteKomentar(@Param('komentarId') komentarId: string, @Request() req: any) {
    return this.service.deleteKomentar(komentarId, req.user.id, req.user.role);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePengumumanDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/komentar')
  addKomentar(
    @Param('id') id: string,
    @Body() dto: CreateKomentarDto,
    @Request() req: any,
  ) {
    return this.service.addKomentar(id, dto, req.user.id);
  }
}
