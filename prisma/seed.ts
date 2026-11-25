import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';

const prisma = new PrismaClient();

/** Mot de passe local conforme à la politique (10+ / maj / min / chiffre / spécial). */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Admin@CSIRT2026';

const SEED_USERS = [
  {
    email: 'admin@arpt.gov.gn',
    firstName: 'Administrateur',
    lastName: 'CSIRT',
    role: 'ASSISTANT',
    department: 'CSIRT-ARPT',
  },
  {
    email: 'dg@arpt.gov.gn',
    firstName: 'Direction',
    lastName: 'Générale',
    role: 'DG',
    department: 'Direction générale',
  },
] as const;

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const now = new Date();

  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        passwordHash,
        passwordChangedAt: now,
        active: true,
        archived: false,
      },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        passwordHash,
        passwordChangedAt: now,
        active: true,
        archived: false,
      },
    });
  }

  console.log('Seed CSIRT-ARPT terminé.');
  console.log(`  Admin plateforme : ${SEED_USERS[0].email}`);
  console.log(`  Direction        : ${SEED_USERS[1].email}`);
  console.log('  Mot de passe     : (SEED_PASSWORD ou Admin@CSIRT2026)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
