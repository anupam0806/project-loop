import { NextResponse } from 'next/server';
import { requireRole } from '../../../utils/requireRole';
import { askLoopRAG } from '../../../services/ai/ragService';
import { askLoopRequestSchema } from '../../../lib/validation/ai';
import { AppError } from '../../../utils/AppError';

export async function POST(req: Request) {
  try {
    const user = await requireRole('ADMIN', 'ANALYST', 'VIEWER');
    
    const body = await req.json();
    const parsed = askLoopRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid fields.",
          fields: parsed.error.flatten().fieldErrors
        }
      }, { status: 400 });
    }

    const { question } = parsed.data;

    const result = await askLoopRAG(user.workspaceId, question);

    return NextResponse.json({
      data: result
    });
  } catch (error: any) {
    console.error("Ask LOOP Error:", error);
    if (error instanceof AppError) {
      return NextResponse.json({
        error: {
          code: "AI_PROCESSING_FAILED",
          message: error.message
        }
      }, { status: error.statusCode });
    }
    return NextResponse.json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred."
      }
    }, { status: 500 });
  }
}
