import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(`EMAIL:${u.email} ACTIVE:${u.isActive} ROLE:${u.role}`);
  }
}
main().finally(() => prisma.$disconnect());
