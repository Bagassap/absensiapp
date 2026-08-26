import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

export const SUPER_ADMIN_LOGIN_ID = '02082021080';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.loginId !== SUPER_ADMIN_LOGIN_ID) {
      throw new ForbiddenException('Hanya super admin yang dapat mengakses fitur ini');
    }
    return true;
  }
}
