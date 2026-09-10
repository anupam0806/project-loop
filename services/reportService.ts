import { prisma } from '../lib/db';
import { AIProvider, ReportEvidence, ReportNarrativeResult } from './ai/aiProvider';
import { getAIProvider } from './ai/providerFactory';
import { AppError } from '../utils/AppError';
import { CreateReportInput } from '../lib/validation/report';

export interface ReportStats {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mixedCount: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  mixedPercentage: number;
  channelCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  topThemes: Array<{ id?: string; name: string; count: number }>;
  sentimentDelta?: {
    positiveChange: number;
    negativeChange: number;
  };
}

export interface StoredReportDTO {
  id: string;
  workspaceId: string;
  title: string;
  period: { from: string; to: string };
  stats: ReportStats;
  narrative: ReportNarrativeResult;
  createdAt: string;
  updatedAt: string;
}

export async function generateReport(
  workspaceId: string,
  input: CreateReportInput,
  customProvider?: AIProvider
): Promise<StoredReportDTO> {
  const fromDate = new Date(input.period.from);
  const toDate = new Date(input.period.to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new AppError("Invalid period dates provided.", 400);
  }

  if (fromDate > toDate) {
    throw new AppError("Start date cannot be after end date.", 400);
  }

  // 1. Load workspace-scoped feedback in period
  const feedbacks = await prisma.feedback.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      themes: {
        include: {
          theme: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Deterministic statistics calculation
  const totalFeedback = feedbacks.length;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let mixedCount = 0;

  const channelCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = { NEW: 0, REVIEWED: 0, ACTIONED: 0 };
  const themeCountsMap = new Map<string, { id: string; name: string; count: number }>();

  for (const fb of feedbacks) {
    if (fb.sentiment === 'POSITIVE') positiveCount++;
    else if (fb.sentiment === 'NEGATIVE') negativeCount++;
    else if (fb.sentiment === 'NEUTRAL') neutralCount++;
    else if (fb.sentiment === 'MIXED') mixedCount++;

    channelCounts[fb.channel] = (channelCounts[fb.channel] || 0) + 1;
    if (fb.status) {
      statusCounts[fb.status] = (statusCounts[fb.status] || 0) + 1;
    }

    if (fb.themes) {
      for (const ft of fb.themes) {
        if (ft.theme) {
          const existing = themeCountsMap.get(ft.theme.id) || { id: ft.theme.id, name: ft.theme.name, count: 0 };
          existing.count++;
          themeCountsMap.set(ft.theme.id, existing);
        }
      }
    }
  }

  const sentimentTotal = positiveCount + negativeCount + neutralCount + mixedCount;
  const positivePercentage = sentimentTotal ? (positiveCount / sentimentTotal) * 100 : 0;
  const negativePercentage = sentimentTotal ? (negativeCount / sentimentTotal) * 100 : 0;
  const neutralPercentage = sentimentTotal ? (neutralCount / sentimentTotal) * 100 : 0;
  const mixedPercentage = sentimentTotal ? (mixedCount / sentimentTotal) * 100 : 0;

  const topThemes = Array.from(themeCountsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(t => ({ id: t.id, name: t.name, count: t.count }));

  // Period delta (comparison against preceding window of equal duration)
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevFromDate = new Date(fromDate.getTime() - durationMs);
  const prevToDate = new Date(fromDate.getTime());

  const prevFeedbacks = await prisma.feedback.findMany({
    where: {
      workspaceId,
      createdAt: {
        gte: prevFromDate,
        lt: prevToDate,
      },
    },
    select: { sentiment: true },
  });

  let sentimentDelta: { positiveChange: number; negativeChange: number } | undefined;
  if (prevFeedbacks.length > 0) {
    const prevPos = prevFeedbacks.filter(f => f.sentiment === 'POSITIVE').length;
    const prevNeg = prevFeedbacks.filter(f => f.sentiment === 'NEGATIVE').length;
    const prevTotal = prevFeedbacks.filter(f => f.sentiment !== null).length;
    if (prevTotal > 0) {
      const prevPosPct = (prevPos / prevTotal) * 100;
      const prevNegPct = (prevNeg / prevTotal) * 100;
      sentimentDelta = {
        positiveChange: positivePercentage - prevPosPct,
        negativeChange: negativePercentage - prevNegPct,
      };
    }
  }

  const stats: ReportStats = {
    totalFeedback,
    positiveCount,
    negativeCount,
    neutralCount,
    mixedCount,
    positivePercentage: Math.round(positivePercentage * 10) / 10,
    negativePercentage: Math.round(negativePercentage * 10) / 10,
    neutralPercentage: Math.round(neutralPercentage * 10) / 10,
    mixedPercentage: Math.round(mixedPercentage * 10) / 10,
    channelCounts,
    statusCounts,
    topThemes,
    sentimentDelta: sentimentDelta ? {
      positiveChange: Math.round(sentimentDelta.positiveChange * 10) / 10,
      negativeChange: Math.round(sentimentDelta.negativeChange * 10) / 10,
    } : undefined,
  };

  // 3. Collect real customer feedback evidence (up to 15 items)
  const evidence: ReportEvidence[] = feedbacks.slice(0, 15).map(f => ({
    id: f.id,
    text: f.text,
    channel: f.channel,
    sentiment: f.sentiment,
  }));

  // 4. Send controlled factual request to Claude
  const provider = customProvider || getAIProvider();
  let narrative: ReportNarrativeResult;
  try {
    narrative = await provider.generateReportNarrative({
      title: input.title,
      period: { from: input.period.from, to: input.period.to },
      statistics: stats,
      evidence,
    });

  } catch (error: any) {
    throw new AppError(`Report narrative generation failed: ${error.message}`, 500);
  }

  // 5. Strict quote validation: every quote must originate from evidence
  const validEvidenceMap = new Map<string, string>(feedbacks.map(f => [f.id, f.text]));
  const validatedQuotes: Array<{ feedbackId: string; quote: string }> = [];

  for (const q of narrative.quotes || []) {
    const feedbackText = validEvidenceMap.get(q.feedbackId);
    if (!feedbackText) {
      // Reject unsupported quotes
      continue;
    }
    // Verify quote text is an actual snippet/substring or reasonably matched
    if (q.quote && feedbackText.toLowerCase().includes(q.quote.trim().toLowerCase().substring(0, 15))) {
      validatedQuotes.push(q);
    }
  }

  narrative.quotes = validatedQuotes;

  // 6. Persist report to database
  const title = input.title || `Voice of Customer Report (${input.period.from} to ${input.period.to})`;
  const reportRecord = await prisma.report.create({
    data: {
      workspaceId,
      title,
      periodStart: fromDate,
      periodEnd: toDate,
      content: JSON.stringify({ stats, narrative }),
    },
  });

  return {
    id: reportRecord.id,
    workspaceId: reportRecord.workspaceId,
    title: reportRecord.title,
    period: {
      from: reportRecord.periodStart.toISOString().split('T')[0],
      to: reportRecord.periodEnd.toISOString().split('T')[0],
    },
    stats,
    narrative,
    createdAt: reportRecord.createdAt.toISOString(),
    updatedAt: reportRecord.updatedAt.toISOString(),
  };
}

export async function listReports(workspaceId: string) {
  const reports = await prisma.report.findMany({
    where: { workspaceId },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return reports.map(r => ({
    id: r.id,
    workspaceId: r.workspaceId,
    title: r.title,
    period: {
      from: r.periodStart.toISOString().split('T')[0],
      to: r.periodEnd.toISOString().split('T')[0],
    },
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getReportById(workspaceId: string, id: string): Promise<StoredReportDTO | null> {
  const report = await prisma.report.findFirst({
    where: {
      id,
      workspaceId,
    },
  });

  if (!report) return null;

  let parsedContent: { stats: ReportStats; narrative: ReportNarrativeResult };
  try {
    parsedContent = JSON.parse(report.content);
  } catch (e) {
    throw new AppError("Malformed stored report data", 500);
  }

  return {
    id: report.id,
    workspaceId: report.workspaceId,
    title: report.title,
    period: {
      from: report.periodStart.toISOString().split('T')[0],
      to: report.periodEnd.toISOString().split('T')[0],
    },
    stats: parsedContent.stats,
    narrative: parsedContent.narrative,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
