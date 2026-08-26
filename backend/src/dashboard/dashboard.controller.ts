import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  getAdmin() {
    return this.service.getAdminStats();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.GURU)
  @Get('guru')
  getGuru(@Request() req: any) {
    return this.service.getGuruStats(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SISWA)
  @Get('siswa')
  getSiswa(@Request() req: any) {
    return this.service.getSiswaStats(req.user.id);
  }
}
