import { NextResponse } from 'next/server';
import { requireAuth } from '../../../utils/requireAuth';
import { getWorkspace } from '../../../services/workspaceService';
import { AppError } from '../../../utils/AppError';

export const dynamic = 'force-dynamic';

export async function GET() {

  try {
    const user = await requireAuth();
    const workspace = await getWorkspace(user.workspaceId);
    return NextResponse.json({ data: workspace });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'WORKSPACE_ERROR', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
