import { prisma } from "../lib/db";
import { z } from "zod";
import { parse } from "csv-parse/sync";

const csvRowSchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(5000, "Text must not exceed 5,000 characters"),
  channel: z.enum(["SUPPORT","APP_REVIEW","SURVEY","SALES","SOCIAL","SIMULATED"]),
  featureArea: z.string().trim().max(100, "Feature area must not exceed 100 characters").optional(),
});

function sanitizeFormula(str: string): string {
  // Neutralize formula injection in spreadsheet exports (=, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function importCsv(workspaceId: string, csvText: string) {
  let records: any[];
  try {
    records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    // Return a summary indicating parse failure instead of throwing
    return { totalRows: 0, imported: 0, failed: 0, errors: [{ row: 0, message: "Failed to parse CSV" }] } as any;
  }

  // Enforce max 1,000 row limit per PRD / File 04 specification
  if (records.length > 1000) {
    return {
      totalRows: records.length,
      imported: 0,
      failed: records.length,
      errors: [{ row: 0, message: "CSV exceeds maximum allowed limit of 1,000 rows" }],
    };
  }

  const errors: any[] = [];
  const toCreate: any[] = [];
  records.forEach((row, idx) => {
    const result = csvRowSchema.safeParse(row);
    if (!result.success) {
      errors.push({ row: idx + 1, message: result.error.message });
    } else {
      toCreate.push({
        text: sanitizeFormula(result.data.text),
        channel: result.data.channel,
        featureArea: result.data.featureArea ? sanitizeFormula(result.data.featureArea) : undefined,
        workspaceId,
      });
    }
  });
  const created = await prisma.$transaction(toCreate.map(data => prisma.feedback.create({ data, select: { id: true } })));
  return { totalRows: records.length, imported: created.length, failed: errors.length, errors };
}

