import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  createAccount(@Body() dto: CreateUserDto) {
    return this.service.createAccount(dto);
  }

  @Get('password-status')
  findPasswordStatus() {
    return this.service.findPasswordStatus();
  }

  @Get('guru')
  findGuruList() {
    return this.service.findGuruList();
  }

  @Patch('guru/:id/nonaktifkan')
  deactivateGuru(@Param('id') id: string) {
    return this.service.deactivateGuru(id);
  }

  @Patch('guru/:id/aktifkan')
  activateGuru(@Param('id') id: string) {
    return this.service.activateGuru(id);
  }

  @Get('password-reset-requests')
  findPasswordResetRequests() {
    return this.service.findPasswordResetRequests();
  }

  @Patch('password-reset-requests/:id/complete')
  completePasswordResetRequest(@Param('id') id: string, @Request() req: any) {
    return this.service.completePasswordResetRequest(id, req.user.id);
  }
}
