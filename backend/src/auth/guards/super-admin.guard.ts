import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// True super admin — the only account allowed to reset anyone's password
// (see UsersService.resetPassword) and other most-sensitive actions. Kept as
// a single ID, separate from the wider Data Guru whitelist below.
export const SUPER_ADMIN_LOGIN_ID = '02082021080';

// Admins allowed to manage Data Guru (UsersController: list/edit/aktifkan/
// nonaktifkan guru, buat akun, kelola permintaan reset password) — Bagas
// Saputra (super admin) plus Muhammad Syukron, ditambahkan atas permintaan
// langsung supaya dia punya akses yang sama dengan Bagas di menu ini.
export const DATA_GURU_MANAGER_LOGIN_IDS = [SUPER_ADMIN_LOGIN_ID, '13072015051'];

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !DATA_GURU_MANAGER_LOGIN_IDS.includes(user.loginId)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke fitur ini');
    }
    return true;
  }
}
