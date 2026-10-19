import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../../generated/prisma/client';
import { PushService } from './push.service';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(input: CreateNotificationInput) {
    const created = await this.prisma.notification.create({
      data: {
        userId:  input.userId,
        title:   input.title,
        message: input.message,
        type:    input.type ?? NotificationType.SISTEM,
        link:    input.link,
      },
    });
    void this.push.sendToUsers([input.userId], {
      title: input.title,
      body: input.message,
      url: input.link ?? '/',
    });
    return created;
  }

  async createMany(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
    if (userIds.length === 0) return { count: 0 };
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title:   input.title,
        message: input.message,
        type:    input.type ?? NotificationType.SISTEM,
        link:    input.link,
      })),
    });
    void this.push.sendToUsers(userIds, {
      title: input.title,
      body: input.message,
      url: input.link ?? '/',
    });
    return result;
  }

  async findAllForUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (notif.userId !== userId) throw new ForbiddenException('Bukan notifikasi Anda');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async remove(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (notif.userId !== userId) throw new ForbiddenException('Bukan notifikasi Anda');
    return this.prisma.notification.delete({ where: { id } });
  }
}
