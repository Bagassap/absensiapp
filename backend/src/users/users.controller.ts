import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { ImportSiswaService } from './import-siswa.service';
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
  constructor(
    private readonly service: UsersService,
    private readonly importSiswaService: ImportSiswaService,
  ) {}

  @Post()
  createAccount(@Body() dto: CreateUserDto) {
    return this.service.createAccount(dto);
  }

  @Get('import-siswa/template')
  async importSiswaTemplate(@Res() res: Response) {
    const buffer = await this.importSiswaService.buildTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template_Impor_Siswa_Baru.xlsx"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Post('import-siswa')
  @UseInterceptors(FileInterceptor('file'))
  importSiswa(@UploadedFile() file: Express.Multer.File) {
    return this.importSiswaService.importFromBuffer(file.buffer);
  }

  @Get('password-status')
  findPasswordStatus() {
    return this.service.findPasswordStatus();
  }

  @Get('manajemen-password/siswa')
  findSiswaPasswordStatus(
    @Query('kelasId') kelasId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findSiswaPasswordStatus(
      kelasId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
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
