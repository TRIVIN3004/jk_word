import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse } from '@/lib/auth';

// POST /api/docs/chapters/[id]/comments — add comment
export const POST = withAuth(async (req, user, context) => {
  const { id } = await context.params;
  const { text } = await req.json();

  if (!text) return errorResponse('Comment text required', 400);

  const comment = {
    id: `c-${Date.now()}`,
    chapter_id: id,
    author: user.name,
    text,
    timestamp: new Date().toISOString(),
  };

  const { error } = await supabase.from('comments').insert(comment);
  if (error) throw error;

  return NextResponse.json(
    {
      id: comment.id,
      chapterId: id,
      user: comment.author,
      text,
      timestamp: comment.timestamp,
    },
    { status: 201 }
  );
});
