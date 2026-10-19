import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('token='));
  return match ? decodeURIComponent(match.slice('token='.length)) : null;
}

export function createUploadAuthMiddleware(
  prisma: PrismaService,
  jwtService: JwtService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ message: 'Tidak terautentikasi' });
      return;
    }

    let payload: { sub: string };
    try {
      payload = await jwtService.verifyAsync(token);
    } catch {
      res.status(401).json({ message: 'Sesi tidak valid' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Akun tidak ditemukan atau tidak aktif' });
      return;
    }

    next();
  };
}
