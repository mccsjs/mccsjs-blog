import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

const existing = await prisma.user.findFirst({ where: { email: 'admin@qq.com' } });
if (existing) {
  console.log('exists');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.user.create({
  data: {
    name: 'Admin',
    email: 'admin@qq.com',
    password: '12345678',
  },
});
console.log('created');
await prisma.$disconnect();
