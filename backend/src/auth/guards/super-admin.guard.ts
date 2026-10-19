import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

export const SUPER_ADMIN_LOGIN_ID = '02082021080';

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
