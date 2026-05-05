import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function hash(pw: string) { return bcrypt.hash(pw, 12); }

async function reset() {
  console.log("Resetting passwords for all users...");
  const users = await prisma.user.findMany();
  for (const u of users) {
    let pw = "";
    if (u.email === "admin@h12rcdg.mil.ph") pw = "Admin@12345";
    else if (u.email === "s1officer@h12rcdg.mil.ph") pw = "S1Officer@12345";
    else if (u.email === "clerk.alpha@h12rcdg.mil.ph") pw = "Clerk@12345";
    else if (u.email === "viewer@h12rcdg.mil.ph") pw = "Viewer@12345";
    
    if (pw) {
      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash: await hash(pw), isActive: true }
      });
      console.log(`- ${u.email} reset to ${pw}`);
    }
  }
}

reset().finally(() => prisma.$disconnect());
