import { Module } from '@nestjs/common';
import { CatatanSiswaController } from './catatan-siswa.controller';
import { CatatanSiswaService } from './catatan-siswa.service';
import { CatatanSiswaExcelService } from './catatan-siswa-excel.service';
import { CatatanSiswaPdfService } from './catatan-siswa-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatatanSiswaController],
  providers: [CatatanSiswaService, CatatanSiswaExcelService, CatatanSiswaPdfService],
})
export class CatatanSiswaModule {}
