import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SiswaController } from './siswa.controller';
import { SiswaService } from './siswa.service';
import { SiswaPdfService } from './siswa-pdf.service';
import { SiswaExcelService } from './siswa-excel.service';

@Module({
  imports: [AuthModule],
  controllers: [SiswaController],
  providers: [SiswaService, SiswaPdfService, SiswaExcelService],
})
export class SiswaModule {}
