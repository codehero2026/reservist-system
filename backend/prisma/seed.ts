// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function createUser(email: string, password: string, fullName: string, role: string, company?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { console.log(`  ⏭  Already exists: ${email}`); return; }
  await prisma.user.create({
    data: { email, passwordHash: await hash(password), fullName, role: role as "ADMIN" | "S1_OFFICER" | "UNIT_CLERK" | "VIEWER", company: company ?? null, isActive: true },
  });
  console.log(`  ✅ Created: ${email} / ${password}`);
}

async function main() {
  console.log("🌱 Seeding database...");
  await createUser("admin@h12rcdg.mil.ph",       "Admin@12345",     "System Administrator", "ADMIN");
  await createUser("s1officer@h12rcdg.mil.ph",   "S1Officer@12345", "S1 Officer",           "S1_OFFICER");
  await createUser("clerk.alpha@h12rcdg.mil.ph", "Clerk@12345",     "Alpha Company Clerk",  "UNIT_CLERK", "ALPHA");
  await createUser("viewer@h12rcdg.mil.ph",       "Viewer@12345",    "Read-Only Viewer",     "VIEWER");
  console.log("🌱 Done.");
}

main()
  .catch((e) => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
