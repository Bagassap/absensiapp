import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;
  readonly publicKey: string;

  constructor(private readonly prisma: PrismaService) {
    this.publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
    const priv = process.env.VAPID_PRIVATE_KEY ?? '';
    this.enabled = !!(this.publicKey && priv);
    if (this.enabled) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@smklimpung.id', this.publicKey, priv);
    } else {
      this.logger.warn('VAPID key belum diatur: push notification dinonaktifkan');
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  async subscribe(userId: string, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { userId, p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.enabled || userIds.length === 0) return;
    try {
      const subs = await this.prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
      if (subs.length === 0) return;
      const body = JSON.stringify(payload);
      const dead: string[] = [];
      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 });
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) dead.push(s.id);
            else this.logger.warn(`Push gagal (${code ?? 'unknown'})`);
          }
        }),
      );
      if (dead.length > 0) await this.prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    } catch (e) {
      this.logger.warn(`Push error: ${(e as Error).message}`);
    }
  }
}
