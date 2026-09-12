import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateEmbedding } from '../services/ai/embeddingService';

const prisma = new PrismaClient();

const REALISTIC_FEEDBACK_TEMPLATES: Record<string, string[]> = {
  Performance: [
    "Dashboard charts take over 4 seconds to render when filtering across large date ranges.",
    "API query latency improved dramatically after the recent performance release. Very responsive.",
    "Exporting 5,000 feedback records to CSV occasionally times out on slower connections.",
    "Search queries return in under 50ms across the full feedback archive.",
  ],
  Usability: [
    "The Calm UI layout is exceptionally clean and lets us focus on customer signals without clutter.",
    "Keyboard shortcuts in the feedback inbox have doubled our daily review throughput.",
    "Mobile view works well, but filter dropdowns could be slightly more tap-friendly on smaller screens.",
    "Color-independent sentiment badges with explicit symbols make triaging accessible.",
  ],
  Bug: [
    "Submitting feedback with multi-byte unicode emojis caused a momentary validation failure.",
    "Status selector occasionally requires two clicks to change status from NEW to REVIEWED.",
    "Theme count badge did not reflect the newest CSV import until hard refreshing the page.",
    "Resolved an intermittent glitch where pagination buttons remained active on the last page.",
  ],
  'Feature Request': [
    "Would love automated Slack notifications when high or critical urgency feedback arrives.",
    "Please add webhook support so incoming NPS survey responses flow directly into Project LOOP.",
    "Requesting saved filter presets like 'Urgent Bugs' or 'Billing Questions' for quick access.",
    "Can we get customizable automated tag rules based on recurring customer keywords?",
  ],
  Pricing: [
    "The pricing structure is very fair and transparent for seed-stage startups.",
    "Monthly feedback ingestion quotas are slightly tight for high-volume B2C consumer mobile apps.",
    "Self-serve invoice history and receipt downloads in settings made procurement easy.",
    "Clear separation between free tier and professional tier features.",
  ],
  Support: [
    "The support team resolved our workspace configuration ticket within twenty minutes. Outstanding!",
    "Documentation for CSV header formatting and schema constraints was clear and saved us setup time.",
    "Would appreciate video tutorials covering Ask LOOP prompt engineering best practices.",
    "Help center search could provide deeper code examples for the REST API endpoints.",
  ],
  Reliability: [
    "Platform has maintained 100% uptime over our three months of continuous ingestion.",
    "CSV background batch imports process consistently without dropping rows or duplicating IDs.",
    "Transient network disconnects during mobile sync were gracefully retried without data loss.",
    "Database backup and multi-tenant isolation give our compliance team complete confidence.",
  ],
  Integrations: [
    "Connecting our Zendesk support tickets into the feedback inbox took less than ten minutes.",
    "Direct integration with GitHub Issues allows our engineers to link feedback directly to PRs.",
    "Looking forward to native HubSpot CRM contact enrichment for sales conversations.",
    "Intercom chat transcript ingestion works smoothly with automatic category assignment.",
  ],
};

async function main() {
  console.log("Seeding Project LOOP database...");
  
  // 1. Demo Workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws-seed-1' },
    update: {},
    create: {
      id: 'ws-seed-1',
      name: 'Demo Workspace',
    },
  });

  // 2. Demo Users (ADMIN, ANALYST, VIEWER)
  const passwordHash = await bcrypt.hash('password123', 10);
  const roles = ['ADMIN', 'ANALYST', 'VIEWER'] as const;
  
  for (const role of roles) {
    await prisma.user.upsert({
      where: { email: `${role.toLowerCase()}@example.com` },
      update: { passwordHash },
      create: {
        email: `${role.toLowerCase()}@example.com`,
        name: `${role} User`,
        passwordHash,
        role,
        workspaceId: workspace.id,
      },
    });
  }

  // 3. 8 Authoritative Themes
  const themeNames = ['Performance', 'Usability', 'Bug', 'Feature Request', 'Pricing', 'Support', 'Reliability', 'Integrations'];
  const themes: Array<{ id: string; name: string }> = [];

  for (const name of themeNames) {
    let t = await prisma.theme.findFirst({
      where: { workspaceId: workspace.id, name }
    });
    if (!t) {
      t = await prisma.theme.create({
        data: { workspaceId: workspace.id, name }
      });
    }
    themes.push(t);
  }

  // 4. Check existing feedback count to avoid duplicate inflation
  const existingCount = await prisma.feedback.count({
    where: { workspaceId: workspace.id }
  });

  console.log(`Current workspace feedback count: ${existingCount}`);

  // If workspace already has >= 120 feedbacks, connect any unlinked themes
  if (existingCount >= 120) {
    console.log("Workspace already contains sufficient seed feedback (>= 120). Ensuring theme associations...");
    const unlinkedFeedbacks = await prisma.feedback.findMany({
      where: { workspaceId: workspace.id, themes: { none: {} } },
      take: 160,
    });

    for (let idx = 0; idx < unlinkedFeedbacks.length; idx++) {
      const fb = unlinkedFeedbacks[idx];
      const targetTheme = themes[idx % themes.length];
      await prisma.feedbackTheme.upsert({
        where: {
          feedbackId_themeId: {
            feedbackId: fb.id,
            themeId: targetTheme.id,
          },
        },
        update: {},
        create: {
          feedbackId: fb.id,
          themeId: targetTheme.id,
          confidence: 0.9,
        },
      });
    }
  } else {
    // Generate 160 realistic feedback records spanning past 90 days
    console.log("Generating 160 realistic feedback records spanning 90 days...");
    const now = new Date();
    const channels = ['SUPPORT', 'APP_REVIEW', 'SURVEY', 'SALES', 'SOCIAL', 'SIMULATED'] as const;
    const sentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as const;
    const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
    const statuses = ['NEW', 'REVIEWED', 'ACTIONED'] as const;

    for (let i = 0; i < 160; i++) {
      const pastDays = Math.floor(Math.random() * 90);
      const createdAt = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
      
      const theme = themes[i % themes.length];
      const templates = REALISTIC_FEEDBACK_TEMPLATES[theme.name] || REALISTIC_FEEDBACK_TEMPLATES['Usability'];
      const text = templates[i % templates.length] + ` [Ref #${1000 + i}]`;
      const channel = channels[i % channels.length];
      const sentiment = sentiments[i % sentiments.length];
      const urgency = urgencies[i % urgencies.length];
      const status = statuses[i % statuses.length];
      const sentimentScore = sentiment === 'POSITIVE' ? 0.8 : sentiment === 'NEGATIVE' ? -0.8 : 0.0;

      const fb = await prisma.feedback.create({
        data: {
          workspaceId: workspace.id,
          text,
          channel,
          sentiment,
          sentimentScore,
          urgency,
          category: theme.name,
          status,
          createdAt,
          classificationModel: 'seed-realistic-voc',
          classifiedAt: createdAt,
        }
      });

      // Link to primary theme
      await prisma.feedbackTheme.create({
        data: {
          feedbackId: fb.id,
          themeId: theme.id,
          confidence: 0.92,
          createdAt,
        }
      });

      // Generate embedding vector
      const vectorArray = await generateEmbedding(text);
      const vectorString = `[${vectorArray.join(',')}]`;
      
      await prisma.$executeRaw`
        INSERT INTO "Embedding" (id, "workspaceId", "feedbackId", model, dimensions, vector, "createdAt")
        VALUES (
          gen_random_uuid(),
          ${workspace.id},
          ${fb.id},
          'Xenova/all-MiniLM-L6-v2',
          384,
          CAST(${vectorString} AS vector),
          NOW()
        )
      `;
      
      if ((i + 1) % 40 === 0) console.log(`Inserted ${i + 1}/160 records...`);
    }
  }

  // 5. Ensure at least one comprehensive demo VoC Report exists
  const existingReport = await prisma.report.findFirst({
    where: { workspaceId: workspace.id }
  });

  if (!existingReport) {
    console.log("Generating sample demo VoC Report...");
    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const demoStats = {
      totalFeedback: 160,
      positiveCount: 72,
      negativeCount: 36,
      neutralCount: 40,
      mixedCount: 12,
      positivePercentage: 45.0,
      negativePercentage: 22.5,
      neutralPercentage: 25.0,
      mixedPercentage: 7.5,
      channelCounts: {
        SUPPORT: 45,
        APP_REVIEW: 35,
        SURVEY: 30,
        SALES: 22,
        SOCIAL: 18,
        SIMULATED: 10,
      },
      statusCounts: {
        NEW: 80,
        REVIEWED: 50,
        ACTIONED: 30,
      },
      topThemes: [
        { name: 'Usability', count: 32 },
        { name: 'Performance', count: 28 },
        { name: 'Integrations', count: 24 },
        { name: 'Bug', count: 22 },
        { name: 'Feature Request', count: 20 },
      ],
      sentimentDelta: {
        positiveChange: 5.2,
        negativeChange: -3.1,
      },
    };

    const demoNarrative = {
      summary: "Executive analysis for the last 30 days indicates an overall favorable customer sentiment of 45.0%, with negative friction declining by 3.1%. Usability and dashboard clarity received widespread commendation, while latency on large CSV exports remains the leading operational complaint.",
      keyThemes: [
        {
          name: "Usability",
          observation: "Customers highly value the calm UI design system, keyboard shortcuts, and clear accessible sentiment badges.",
        },
        {
          name: "Performance",
          observation: "API response times are consistently under 50ms, though bulk data exports encounter occasional timeout thresholds.",
        },
        {
          name: "Integrations",
          observation: "Zendesk and GitHub connections are functioning smoothly; strong customer demand exists for Slack webhook alerts.",
        },
      ],
      sentimentTrends: "Customer sentiment is trending positively (+5.2% delta), driven by continuous UX enhancements and faster issue resolution in support channels.",
      recommendations: [
        "Optimize CSV export pipeline to handle datasets exceeding 5,000 records asynchronously.",
        "Implement inbound and outbound Slack webhook alerts for critical urgency submissions.",
        "Maintain current Calm UI design standards as new analytics widgets are introduced.",
      ],
      quotes: [],
    };

    await prisma.report.create({
      data: {
        workspaceId: workspace.id,
        title: "Voice of Customer Executive Report - Q3 2026",
        periodStart,
        periodEnd: now,
        content: JSON.stringify({ stats: demoStats, narrative: demoNarrative }),
      },
    });
  }

  console.log("Seeding and demo readiness verified successfully.");
}

main()
  .catch((e) => {
    console.error("Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
