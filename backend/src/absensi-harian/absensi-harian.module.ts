import { Module } from '@nestjs/common';
import { AbsensiHarianController } from './absensi-harian.controller';
import { AbsensiHarianService } from './absensi-harian.service';
import { AbsensiHarianPdfService } from './absensi-harian-pdf.service';
import { AbsensiHarianExcelService } from './absensi-harian-excel.service';
import { KelasModule } from '../kelas/kelas.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [KelasModule, NotificationModule],
  controllers: [AbsensiHarianController],
  providers: [AbsensiHarianService, AbsensiHarianPdfService, AbsensiHarianExcelService],
  exports: [AbsensiHarianPdfService, AbsensiHarianExcelService],
})
export class AbsensiHarianModule {}
