import { NextResponse } from 'next/server';
import { requireRole } from '../../../../utils/requireRole';
import { inviteUserSchema } from '../../../../lib/validation/workspace';
import { listWorkspaceUsers, createWorkspaceUser } from '../../../../services/workspaceService';
import { AppError } from '../../../../utils/AppError';
import { parseJsonBody } from '../../../../utils/safeJson';

export const dynamic = 'force-dynamic';

export async function GET() {

  try {
    const user = await requireRole('ADMIN');
    const users = await listWorkspaceUsers(user.workspaceId);
    return NextResponse.json({ data: users });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'USERS_ERROR', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole('ADMIN');

    const bodyResult = await parseJsonBody(req);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const parsed = inviteUserSchema.safeParse(bodyResult.data);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user details provided.',
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const newUser = await createWorkspaceUser(user.workspaceId, parsed.data);
    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'USER_CREATION_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
