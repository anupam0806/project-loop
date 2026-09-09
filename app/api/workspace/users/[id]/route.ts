import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../utils/requireRole';
import { updateUserSchema } from '../../../../../lib/validation/workspace';
import { updateWorkspaceUser, deleteWorkspaceUser } from '../../../../../services/workspaceService';
import { AppError } from '../../../../../utils/AppError';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('ADMIN');
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user update parameters.',
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateWorkspaceUser(user.workspaceId, params.id, parsed.data);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'USER_UPDATE_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('ADMIN');
    const result = await deleteWorkspaceUser(user.workspaceId, params.id, user.id);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: 'USER_DELETE_FAILED', message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
