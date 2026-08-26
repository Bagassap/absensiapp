import { Module } from '@nestjs/common';
import { UjianUkkController } from './ujian-ukk.controller';
import { UjianUkkService } from './ujian-ukk.service';
import { UjianUkkExcelService } from './ujian-ukk-excel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UjianUkkController],
  providers: [UjianUkkService, UjianUkkExcelService],
})
export class UjianUkkModule {}
