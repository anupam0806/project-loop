import { prisma } from '../../lib/db';
import { ClaudeProvider } from './claudeProvider';
import { MockAIProvider } from './mockAIProvider';

export async function classifyAndAssignThemes(workspaceId: string, feedbackId: string, text: string) {
  const provider = process.env.NODE_ENV === 'test' ? new MockAIProvider() : new ClaudeProvider();

  const classification = await provider.classifyFeedback(text);

  await prisma.$transaction(async (tx) => {
    await tx.feedback.update({
      where: { id: feedbackId, workspaceId },
      data: {
        sentiment: classification.sentiment,
        sentimentScore: classification.sentimentScore,
        urgency: classification.urgency,
        category: classification.category,
        classifiedAt: new Date(),
        classificationModel: process.env.NODE_ENV === 'test' ? 'mock' : 'claude-haiku-4-5-20251001',
      },
    });

    // Theme association
    // Clear existing themes just in case it's a re-classification
    await tx.feedbackTheme.deleteMany({
      where: { feedbackId }
    });

    for (const themeName of classification.themeNames) {
      let theme = await tx.theme.findFirst({
        where: { workspaceId, name: themeName }
      });
      if (!theme) {
        theme = await tx.theme.create({
          data: {
            workspaceId,
            name: themeName,
          }
        });
      }
      await tx.feedbackTheme.create({
        data: {
          feedbackId,
          themeId: theme.id,
          confidence: 0.9, // Default confidence
        }
      });
    }
  });
}
