import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse } from '@/lib/auth';

// GET /api/versions/[chapterId] — get version history for a chapter
export const GET = withAuth(async (req, user, context) => {
  const { chapterId } = await context.params;

  // Check chapter exists
  const { data: chapter, error: chErr } = await supabase
    .from('chapters')
    .select('id')
    .eq('id', chapterId)
    .maybeSingle();

  if (chErr) throw chErr;
  if (!chapter) return errorResponse('Chapter not found', 404);

  const { data: versions, error } = await supabase
    .from('versions')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return NextResponse.json(
    (versions || []).map((v: any) => ({
      id: v.id,
      chapterId: v.chapter_id,
      timestamp: v.timestamp,
      content: v.content,
      author: v.author,
      description: v.description,
    }))
  );
});
