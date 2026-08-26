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
      select: { id: true, role: true, isActive: true, fotoProfil: true },
    });
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Akun tidak ditemukan atau tidak aktif' });
      return;
    }

    // Staff (admin/guru) oversee all attendance/exam evidence — no ownership check needed.
    if (user.role === 'ADMIN' || user.role === 'GURU') {
      next();
      return;
    }

    // Exam question documents are shared material for every participant of a tahapan.
    // Materi modules and tugas attachments are likewise shared instructional
    // material — visibility (kelas/jurusan scope) is already enforced at the
    // API/DB-query layer, not per-file, so no ownership check applies here.
    if (
      req.path.startsWith('/ukk-soal/') ||
      req.path.startsWith('/materi/') ||
      req.path.startsWith('/tugas/')
    ) {
      next();
      return;
    }

    const siswa = await prisma.siswa.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!siswa) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    const requestedUrl = req.originalUrl.split('?')[0];
    let owned = false;

    if (req.path.startsWith('/foto-profil/')) {
      // Every siswa needs to see their own photo (topbar, sidebar, profil
      // saya) but not classmates' — data-siswa's cross-student photo view is
      // ADMIN/GURU-only and already short-circuits above.
      owned = user.fotoProfil === requestedUrl;
    } else if (req.path.startsWith('/absensi-harian/')) {
      const row = await prisma.absensiHarian.findFirst({
        where: {
          siswaId: siswa.id,
          OR: [{ foto: requestedUrl }, { fotoPulang: requestedUrl }],
        },
        select: { id: true },
      });
      owned = !!row;
    } else if (req.path.startsWith('/ukk-submisi/')) {
      const row = await prisma.submisiProjectUKK.findFirst({
        where: { siswaId: siswa.id, fileUrl: requestedUrl },
        select: { id: true },
      });
      owned = !!row;
    } else if (req.path.startsWith('/tugas-submisi/')) {
      const row = await prisma.tugasSubmisi.findFirst({
        where: { siswaId: siswa.id, fileUrl: requestedUrl },
        select: { id: true },
      });
      owned = !!row;
    } else if (req.path.startsWith('/absensi-magang/')) {
      const row = await prisma.absensiMagang.findFirst({
        where: {
          siswaId: siswa.id,
          OR: [{ foto: requestedUrl }, { fotoPulang: requestedUrl }],
        },
        select: { id: true },
      });
      owned = !!row;
    } else if (req.path.startsWith('/lapor-diri-magang/')) {
      const row = await prisma.laporDiriMagang.findFirst({
        where: { siswaId: siswa.id, fileUrl: requestedUrl },
        select: { id: true },
      });
      owned = !!row;
    } else if (req.path.startsWith('/laporan-akhir-magang/')) {
      const row = await prisma.laporanAkhirMagang.findFirst({
        where: { siswaId: siswa.id, fileUrl: requestedUrl },
        select: { id: true },
      });
      owned = !!row;
    }

    if (!owned) {
      res.status(403).json({ message: 'Akses ditolak' });
      return;
    }

    next();
  };
}
