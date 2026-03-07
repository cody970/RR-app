/**
 * Prisma Seed Script — Society Reference Data
 *
 * Imports all 384 PROs/CMOs from the CISAC TIS-N registry into the Society table.
 * This data is sourced from Django Music Publisher's societies.csv.
 *
 * Run with:
 *   npx prisma db seed
 *   # or directly:
 *   npx tsx prisma/seed.ts
 *
 * The seed is idempotent — it uses upsert so it can be run multiple times safely.
 */

import { PrismaClient } from '@prisma/client';
import { getSocietiesForSeed } from '../src/lib/music-metadata/societies';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Society reference data...');

  const societies = getSocietiesForSeed();
  console.log(`   Found ${societies.length} societies to seed.`);

  let created = 0;
  let updated = 0;

  for (const society of societies) {
    const result = await prisma.society.upsert({
      where: { tisN: society.tisN },
      update: {
        name: society.name,
        country: society.country ?? null,
        label: society.label ?? null,
      },
      create: {
        tisN: society.tisN,
        name: society.name,
        country: society.country ?? null,
        label: society.label ?? null,
      },
    });

    // Prisma upsert doesn't directly tell us if it was create or update,
    // so we track by checking if createdAt === updatedAt (within 1 second)
    const isNew = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`   ✅ Seeded ${created} new societies, updated ${updated} existing.`);

  // Log a few well-known societies for verification
  const wellKnown = ['010', '013', '172', '281', '282'];
  console.log('\n   Well-known societies verification:');
  for (const code of wellKnown) {
    const society = await prisma.society.findUnique({ where: { tisN: code } });
    if (society) {
      console.log(`   [${society.tisN}] ${society.name} (${society.country ?? 'N/A'})`);
    } else {
      console.warn(`   ⚠️  Society code ${code} not found after seed!`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });