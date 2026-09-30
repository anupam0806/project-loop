import { prisma } from '../lib/db';

export async function getAnalyticsSummary(workspaceId: string, days?: number) {
  const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
  const feedbackWhere: any = { workspaceId };
  if (startDate) {
    feedbackWhere.createdAt = { gte: startDate };
  }
  const sentimentWhere: any = { workspaceId, sentiment: { not: null } };
  if (startDate) {
    sentimentWhere.createdAt = { gte: startDate };
  }

  // Run independent database queries in parallel to minimize response latency
  const [
    totalFeedback,
    actionableFeedback,
    sentiments,
    volumeByDate,
    sentimentByDate,
    topThemesRaw,
  ] = await Promise.all([
    prisma.feedback.count({
      where: feedbackWhere,
    }),
    prisma.feedback.count({
      where: {
        ...feedbackWhere,
        status: { in: ['NEW', 'REVIEWED'] },
      },
    }),
    prisma.feedback.groupBy({
      by: ['sentiment'],
      where: sentimentWhere,
      _count: { _all: true },
    }),
    startDate ? prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Feedback"
      WHERE "workspaceId" = ${workspaceId} AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
      LIMIT ${days || 30};
    ` : prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Feedback"
      WHERE "workspaceId" = ${workspaceId}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
      LIMIT 30;
    `,
    startDate ? prisma.$queryRaw<Array<{ date: string; sentiment: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, sentiment, COUNT(*) as count
      FROM "Feedback"
      WHERE "workspaceId" = ${workspaceId} AND sentiment IS NOT NULL AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt"), sentiment
      ORDER BY date ASC
      LIMIT ${(days || 30) * 4};
    ` : prisma.$queryRaw<Array<{ date: string; sentiment: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, sentiment, COUNT(*) as count
      FROM "Feedback"
      WHERE "workspaceId" = ${workspaceId} AND sentiment IS NOT NULL
      GROUP BY DATE("createdAt"), sentiment
      ORDER BY date ASC
      LIMIT 120;
    `,
    prisma.theme.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { feedbacks: true },
        },
      },
      orderBy: {
        feedbacks: {
          _count: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  let positiveCount = 0, negativeCount = 0, neutralCount = 0, mixedCount = 0;
  for (const s of sentiments) {
    if (s.sentiment === 'POSITIVE') positiveCount = s._count._all;
    if (s.sentiment === 'NEGATIVE') negativeCount = s._count._all;
    if (s.sentiment === 'NEUTRAL') neutralCount = s._count._all;
    if (s.sentiment === 'MIXED') mixedCount = s._count._all;
  }

  const sentimentTotal = positiveCount + negativeCount + neutralCount + mixedCount;

  let topThemes = topThemesRaw.map(t => ({
    id: t.id,
    name: t.name,
    count: t._count?.feedbacks ?? 0
  }));

  if (startDate) {
    if (totalFeedback === 0) {
      topThemes = topThemes.map(t => ({ ...t, count: 0 }));
    } else {
      try {
        const rows = await prisma.$queryRaw<Array<{ id: string; name: string; count: bigint }>>`
          SELECT t.id, t.name, COUNT(ft.id) as count
          FROM "Theme" t
          JOIN "FeedbackTheme" ft ON ft."themeId" = t.id
          JOIN "Feedback" f ON f.id = ft."feedbackId"
          WHERE t."workspaceId" = ${workspaceId} AND f."createdAt" >= ${startDate}
          GROUP BY t.id, t.name
          ORDER BY count DESC
          LIMIT 5;
        `;
        if (rows && rows.length > 0 && typeof rows[0].name === 'string') {
          topThemes = rows.map(r => ({
            id: r.id,
            name: r.name,
            count: Number(r.count),
          }));
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

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
