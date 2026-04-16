import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MODELS = [
  { slug: 'doubao-seedance-1.5-pro', name: 'Seedance 1.5 Pro', type: 'VIDEO', provider: 'volcano-ark', enabled: true, price_per_unit: 150, unit: '秒' },
  { slug: 'flux-2-schnell', name: 'FLUX 2 Schnell', type: 'IMAGE', provider: 'replicate', enabled: true, price_per_unit: 10, unit: '张' },
  { slug: 'cosyvoice-tts', name: 'CosyVoice TTS', type: 'TTS', provider: 'cosyvoice', enabled: true, price_per_unit: 5, unit: '次' },
];

async function main() {
  for (const m of MODELS) {
    const created = await prisma.model.upsert({
      where: { slug: m.slug },
      update: { enabled: m.enabled },
      create: m as any,
    });
    console.log('✅', created.slug);
  }
  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
