import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../utils/requireAuth';
import { requireRole } from '../../../../utils/requireRole';
import { getAnalyticsSummary } from '../../../../services/analyticsService';
import { AppError } from '../../../../utils/AppError';

export const dynamic = 'force-dynamic';

export async function GET() {

  try {
    const user = await requireRole('ADMIN', 'ANALYST', 'VIEWER');
    
    const summary = await getAnalyticsSummary(user.workspaceId);

    return NextResponse.json({
      data: summary
    });
  } catch (error: any) {
    console.error("Analytics Error:", error);
    if (error instanceof AppError) {
      return NextResponse.json({
        error: {
          code: "ANALYTICS_FAILED",
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
