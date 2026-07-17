import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, requireAdmin, errorResponse } from '@/lib/auth';

// DELETE /api/auth/users/[id] — delete a user (Admin only)
export const DELETE = withAuth(async (_req, user, context) => {
  requireAdmin(user);
  const { id } = context.params;

  if (id === user.id) return errorResponse('You cannot delete your own account.', 400);

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;

  return NextResponse.json({ message: 'User deleted successfully.' });
});
