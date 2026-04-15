import { prisma } from '@ai-toolsite/db';

export const modelService = {
  async listModels(type?: string) {
    const where = {
      is_active: true,
      ...(type && { type: type as any }),
    };

    const models = await prisma.model.findMany({
      where,
      include: { pricing: true },
      orderBy: { sort_order: 'asc' },
    });

    return models.map(m => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      type: m.type,
      description: m.description,
      capability: m.capability,
      pricing: m.pricing.map(p => ({
        unit_price: Number(p.unit_price),
        unit: p.unit,
        level_discounts: {
          NORMAL: 1.0,
          MONTHLY: p.discount ? Number(p.discount) * 0.8 : 0.8,
          YEARLY: p.discount ? Number(p.discount) * 0.7 : 0.7,
        },
      })),
    }));
  },

  async getModelBySlug(slug: string) {
    const model = await prisma.model.findUnique({
      where: { slug },
      include: { pricing: true },
    });
    if (!model || !model.is_active) return null;
    return model;
  },

  async calculatePrice(
    model: { pricing: Array<{ unit_price: string; discount: string | null; level: string; unit: string }> },
    userId: string,
    params: Record<string, unknown>
  ): Promise<{ totalCost: number | null }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userLevel = user?.level ?? 'NORMAL';

    // Find pricing for user's level
    let pricing = model.pricing.find(p => p.level === userLevel);
    if (!pricing) {
      pricing = model.pricing.find(p => p.level === 'NORMAL');
    }
    if (!pricing) return { totalCost: null };

    const unitPrice = Number(pricing.unit_price);
    const discount = pricing.discount ? Number(pricing.discount) : 1.0;

    let quantity = 1;

    if (model.pricing[0]?.unit === 'UNIT_PER_IMAGE') {
      quantity = (params.image_count as number) ?? 1;
    } else if (model.pricing[0]?.unit === 'UNIT_PER_SECOND') {
      quantity = (params.duration as number) ?? 5;
    } else if (model.pricing[0]?.unit === 'UNIT_PER_1K_CHARS') {
      const text = (params.text as string) ?? '';
      quantity = Math.ceil(text.length / 1000);
    }

    const totalCost = Math.round(unitPrice * quantity * discount);

    return { totalCost };
  },
};
