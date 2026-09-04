import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const loginId = process.env.SEED_ADMIN_LOGIN_ID ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('SEED_ADMIN_PASSWORD env is required');

  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findFirst({ where: { loginId } });
  if (existing) {
    console.log(`User with loginId "${loginId}" already exists, skipping.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      nama: 'Administrator',
      loginId,
      password: hashed,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log(`Created admin user: loginId=${user.loginId} id=${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
