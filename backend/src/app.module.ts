import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KelasModule } from './kelas/kelas.module';
import { AbsensiHarianModule } from './absensi-harian/absensi-harian.module';
import { PengumumanModule } from './pengumuman/pengumuman.module';
import { SiswaModule } from './siswa/siswa.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UjianUkkModule } from './ujian-ukk/ujian-ukk.module';
import { NotificationModule } from './notification/notification.module';
import { UsersModule } from './users/users.module';
import { CatatanSiswaModule } from './catatan-siswa/catatan-siswa.module';
import { MateriModule } from './materi/materi.module';
import { TugasModule } from './tugas/tugas.module';
import { MapelModule } from './mapel/mapel.module';
import { MagangModule } from './magang/magang.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 15 * 60 * 1000, limit: 5 },
    ]),
    PrismaModule,
    AuthModule,
    KelasModule,
    AbsensiHarianModule,
    PengumumanModule,
    SiswaModule,
    DashboardModule,
    UjianUkkModule,
    NotificationModule,
    UsersModule,
    CatatanSiswaModule,
    MateriModule,
    TugasModule,
    MapelModule,
    MagangModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
