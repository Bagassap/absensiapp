import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { MapelService } from './mapel.service';
import { AddMapelDto } from './dto/add-mapel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('mapel')
export class MapelController {
  constructor(private readonly service: MapelService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GURU)
  @Get('saya')
  findMine(@Request() req: any) {
    return this.service.findMineByUserId(req.user.id);
  }

  @UseGuards(RolesGuard, SuperAdminGuard)
  @Roles(Role.ADMIN)
  @Get('guru/:guruId')
  listByGuru(@Param('guruId') guruId: string) {
    return this.service.listByGuruId(guruId);
  }

  @UseGuards(RolesGuard, SuperAdminGuard)
  @Roles(Role.ADMIN)
  @Post('guru/:guruId')
  addMapel(@Param('guruId') guruId: string, @Body() dto: AddMapelDto) {
    return this.service.addMapel(guruId, dto.nama);
  }

  @UseGuards(RolesGuard, SuperAdminGuard)
  @Roles(Role.ADMIN)
  @Delete('guru/:guruId/:mapelId')
  removeMapel(@Param('guruId') guruId: string, @Param('mapelId') mapelId: string) {
    return this.service.removeMapel(guruId, mapelId);
  }
}
