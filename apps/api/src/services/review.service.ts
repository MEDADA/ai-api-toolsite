export const reviewService = {
  async reviewText(prompt: string): Promise<{ passed: boolean; reason?: string }> {
    // TODO: Integrate local keyword filter + Aliyun content safety API
    const blocked = ['暴力', '色情', '政治', '赌博'];
    for (const keyword of blocked) {
      if (prompt.includes(keyword)) {
        return { passed: false, reason: `包含敏感词: ${keyword}` };
      }
    }
    return { passed: true };
  },

  async reviewImage(imageUrl: string): Promise<{ passed: boolean; reason?: string }> {
    // TODO: Integrate Aliyun image audit API
    console.log(`[Review] Image review for ${imageUrl} — TODO`);
    return { passed: true };
  },

  async reviewAudio(audioUrl: string): Promise<{ passed: boolean; reason?: string }> {
    // TODO: Integrate Aliyun audio audit API
    console.log(`[Review] Audio review for ${audioUrl} — TODO`);
    return { passed: true };
  },
};
