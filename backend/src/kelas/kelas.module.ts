import { Module } from '@nestjs/common';
import { KelasController } from './kelas.controller';
import { KelasService } from './kelas.service';

@Module({
  controllers: [KelasController],
  providers: [KelasService],
  exports: [KelasService],
})
export class KelasModule {}
