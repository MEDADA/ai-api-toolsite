import { prisma } from '@ai-toolsite/db';

export const favoriteService = {
  async listFavorites(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { user_id: userId },
      include: {
        task: {
          include: { outputs: { take: 1, orderBy: { sort_order: 'asc' } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return favorites.map(f => ({
      id: f.id,
      task_id: f.task_id,
      thumbnail: f.task?.outputs[0]?.thumbnail_url ?? f.task?.outputs[0]?.file_url,
      created_at: f.created_at.toISOString(),
    }));
  },

  async addFavorite(
    userId: string,
    taskId: string
  ): Promise<{ ok: false; code: string; message: string } | { ok: true; favoriteId: string }> {
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task || task.user_id !== userId) {
      return { ok: false, code: 'TASK_NOT_FOUND', message: 'Task not found' };
    }

    const existing = await prisma.favorite.findUnique({
      where: { user_id_task_id: { user_id: userId, task_id: taskId } },
    });
    if (existing) {
      return { ok: false, code: 'ALREADY_FAVORITED', message: 'Already in favorites' };
    }

    const favorite = await prisma.favorite.create({
      data: { user_id: userId, task_id: taskId },
    });

    return { ok: true, favoriteId: favorite.id };
  },

  async removeFavorite(
    userId: string,
    favoriteId: string
  ): Promise<{ ok: false; code: string; message: string } | { ok: true }> {
    const favorite = await prisma.favorite.findUnique({ where: { id: favoriteId } });
    if (!favorite || favorite.user_id !== userId) {
      return { ok: false, code: 'NOT_FOUND', message: 'Favorite not found' };
    }

    await prisma.favorite.delete({ where: { id: favoriteId } });
    return { ok: true };
  },
};
