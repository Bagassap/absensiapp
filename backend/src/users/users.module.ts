import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ImpersonationController } from './impersonation.controller';
import { UsersService } from './users.service';
import { ImportSiswaService } from './import-siswa.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, ImpersonationController],
  providers: [UsersService, ImportSiswaService],
})
export class UsersModule {}
