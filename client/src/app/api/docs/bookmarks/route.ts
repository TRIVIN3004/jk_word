import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

// GET /api/docs/bookmarks — list all user bookmarks
export const GET = withAuth(async (req, user) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('chapter_id, chapters(id, title)')
    .eq('user_id', user.id);

  if (error) throw error;

  const result = (data || [])
    .filter((b: any) => b.chapters)
    .map((b: any) => ({
      id: b.chapters.id,
      title: b.chapters.title,
    }));

  return NextResponse.json(result);
});
