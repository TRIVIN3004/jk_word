import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

// GET /api/auth/me — verify token and return user info
export const GET = withAuth(async (_req, user) => {
  return NextResponse.json({ user });
});
