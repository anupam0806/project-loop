import { prisma } from "../lib/db";
import { z } from "zod";
import { parse } from "csv-parse/sync";

const csvRowSchema = z.object({
  text: z.string().min(1),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]),
  featureArea: z.string().optional(),
});

export async function importCsv(workspaceId: string, csvText: string) {
  let records: any[];
  try {
    records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    // Return a summary indicating parse failure instead of throwing
    return { totalRows: 0, imported: 0, failed: 0, errors: [{ row: 0, message: "Failed to parse CSV" }] } as any;
  }
  const errors: any[] = [];
  const toCreate: any[] = [];
  records.forEach((row, idx) => {
    const result = csvRowSchema.safeParse(row);
    if (!result.success) {
      errors.push({ row: idx + 1, message: result.error.message });
    } else {
      toCreate.push({ ...result.data, workspaceId });
    }
  });
  const created = await prisma.$transaction(toCreate.map(data => prisma.feedback.create({ data, select: { id: true } })));
  return { totalRows: records.length, imported: created.length, failed: errors.length, errors };
}
