import { Controller, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@Controller('users')
export class ImpersonationController {
  constructor(private readonly service: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/impersonate')
  impersonate(@Param('id') id: string, @Request() req: any) {
    return this.service.impersonate(req.user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('stop-impersonate')
  stopImpersonate(@Request() req: any) {
    return this.service.stopImpersonate(req.user);
  }

  // Not superadmin-gated: any admin may reset a student's password from
  // admin/data-siswa. UsersService.resetPassword() still enforces that
  // non-super-admin callers may only target SISWA accounts.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Request() req: any) {
    return this.service.resetPassword(req.user, id, dto);
  }
}
