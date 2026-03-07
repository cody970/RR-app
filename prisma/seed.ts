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

  const rawSocieties = getSocietiesForSeed();
  console.log(`   Found ${rawSocieties.length} societies to seed.`);

  let created = 0;
  let skipped = 0;

  for (const s of rawSocieties) {
    // getSocietiesForSeed() returns { code, name, country, label }
    // Prisma Society model uses tisN as the unique field
    const tisN = s.code;

    if (!tisN) {
      skipped++;
      continue;
    }

    await prisma.society.upsert({
      where: { tisN },
      update: {
        name: s.name,
        country: s.country ?? null,
        label: s.label ?? null,
      },
      create: {
        tisN,
        name: s.name,
        country: s.country ?? null,
        label: s.label ?? null,
      },
    });

    created++;
  }

  console.log(`   ✅ Upserted ${created} societies (skipped ${skipped} with missing code).`);

  // Log a few well-known societies for verification
  const wellKnown = [
    { code: '010', name: 'ASCAP' },
    { code: '013', name: 'BMI' },
    { code: '172', name: 'SESAC' },
    { code: '281', name: 'MLC' },
    { code: '282', name: 'SoundExchange' },
  ];

  console.log('\n   Well-known societies verification:');
  for (const { code, name } of wellKnown) {
    const society = await prisma.society.findUnique({ where: { tisN: code } });
    if (society) {
      console.log(`   ✓ [${society.tisN}] ${society.name} (${society.country ?? 'N/A'})`);
    } else {
      console.warn(`   ⚠️  ${name} (code ${code}) not found after seed!`);
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