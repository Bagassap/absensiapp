import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { PenempatanService } from './penempatan.service';
import { CreatePenempatanDto, UpdatePenempatanDto } from './dto/create-penempatan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('magang/penempatan')
export class PenempatanController {
  constructor(private readonly service: PenempatanService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('saya')
  findSaya(@Request() req: any) {
    return this.service.findSaya(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.GURU)
  @Get('bimbingan')
  findBimbingan(@Request() req: any) {
    return this.service.findBimbingan(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('tempatMagangId') tempatMagangId?: string,
    @Query('kelasId') kelasId?: string,
  ) {
    return this.service.findAll({ status, tempatMagangId, kelasId });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePenempatanDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePenempatanDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
