import { prisma } from '../lib/db';

export async function getAnalyticsSummary(workspaceId: string) {
  // Deterministic count calculations
  const totalFeedback = await prisma.feedback.count({
    where: { workspaceId }
  });

  const sentiments = await prisma.feedback.groupBy({
    by: ['sentiment'],
    where: { workspaceId, sentiment: { not: null } },
    _count: { _all: true },
  });

  let positiveCount = 0, negativeCount = 0, neutralCount = 0, mixedCount = 0;
  for (const s of sentiments) {
    if (s.sentiment === 'POSITIVE') positiveCount = s._count._all;
    if (s.sentiment === 'NEGATIVE') negativeCount = s._count._all;
    if (s.sentiment === 'NEUTRAL') neutralCount = s._count._all;
    if (s.sentiment === 'MIXED') mixedCount = s._count._all;
  }

  const sentimentTotal = positiveCount + negativeCount + neutralCount + mixedCount;

  // Actionable feedback calculation is explicitly UNRESOLVED and thus omitted or returned as 0/null
  const actionableFeedback = 0; 

  const volumeByDate = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
    SELECT DATE("createdAt") as date, COUNT(*) as count
    FROM "Feedback"
    WHERE "workspaceId" = ${workspaceId}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
    LIMIT 30;
  `;

  // Sentiment over time
  const sentimentByDate = await prisma.$queryRaw<Array<{ date: string; sentiment: string; count: bigint }>>`
    SELECT DATE("createdAt") as date, sentiment, COUNT(*) as count
    FROM "Feedback"
    WHERE "workspaceId" = ${workspaceId} AND sentiment IS NOT NULL
    GROUP BY DATE("createdAt"), sentiment
    ORDER BY date ASC
    LIMIT 120;
  `;

  const topThemesRaw = await prisma.theme.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: { feedbacks: true }
      }
    },
    orderBy: {
      feedbacks: {
        _count: 'desc'
      }
    },
    take: 5
  });

  const topThemes = topThemesRaw.map(t => ({
    id: t.id,
    name: t.name,
    count: t._count?.feedbacks ?? 0
  }));

  const sentimentOverTime = volumeByDate.map(v => {
    const dStr = v.date.toString();
    const sentsForDate = sentimentByDate.filter(s => s.date.toString() === dStr);
    return {
      date: dStr,
      positive: Number(sentsForDate.find(s => s.sentiment === 'POSITIVE')?.count || 0),
      negative: Number(sentsForDate.find(s => s.sentiment === 'NEGATIVE')?.count || 0),
      neutral: Number(sentsForDate.find(s => s.sentiment === 'NEUTRAL')?.count || 0),
      mixed: Number(sentsForDate.find(s => s.sentiment === 'MIXED')?.count || 0),
    }
  });

  return {
    totalFeedback,
    positivePercentage: sentimentTotal ? (positiveCount / sentimentTotal) * 100 : 0,
    negativePercentage: sentimentTotal ? (negativeCount / sentimentTotal) * 100 : 0,
    neutralPercentage: sentimentTotal ? (neutralCount / sentimentTotal) * 100 : 0,
    mixedPercentage: sentimentTotal ? (mixedCount / sentimentTotal) * 100 : 0,
    actionableFeedback,
    volumeOverTime: volumeByDate.map(v => ({ date: v.date.toString(), count: Number(v.count) })),
    sentimentOverTime,
    topThemes,
  };
}
