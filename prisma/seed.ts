import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateEmbedding } from '../services/ai/embeddingService';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  // 1 Workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws-seed-1' },
    update: {},
    create: {
      id: 'ws-seed-1',
      name: 'Demo Workspace',
    },
  });

  // 3 Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const roles = ['ADMIN', 'ANALYST', 'VIEWER'] as const;
  
  for (const role of roles) {
    await prisma.user.upsert({
      where: { email: `${role.toLowerCase()}@example.com` },
      update: {},
      create: {
        email: `${role.toLowerCase()}@example.com`,
        name: `${role} User`,
        passwordHash,
        role,
        workspaceId: workspace.id,
      },
    });
  }

  // 8 Themes
  const themeNames = ['Performance', 'Usability', 'Bug', 'Feature Request', 'Pricing', 'Support', 'Reliability', 'Integrations'];
  const themes = [];
  for (const name of themeNames) {
    const t = await prisma.theme.create({
      data: { workspaceId: workspace.id, name }
    });
    themes.push(t);
  }

  // 160 Feedbacks spanning 90 days
  const now = new Date();
  const channels = ['SUPPORT', 'APP_REVIEW', 'SURVEY', 'SALES', 'SOCIAL', 'SIMULATED'];
  const sentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'];
  const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  console.log("Generating 160 feedback records...");
  
  for (let i = 0; i < 160; i++) {
    // Random date in past 90 days
    const pastDays = Math.floor(Math.random() * 90);
    const createdAt = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
    
    const text = `This is a sample feedback message ${i} about ${themeNames[i % themeNames.length]}`;
    const channel = channels[i % channels.length] as any;
    const sentiment = sentiments[i % sentiments.length] as any;
    const urgency = urgencies[i % urgencies.length];

    const fb = await prisma.feedback.create({
      data: {
        workspaceId: workspace.id,
        text,
        channel,
        sentiment,
        sentimentScore: 0.5,
        urgency,
        category: 'General',
        createdAt,
        classificationModel: 'seed-data',
        classifiedAt: createdAt
      }
    });

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
    
    if (i % 20 === 0) console.log(`Inserted ${i} records...`);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
