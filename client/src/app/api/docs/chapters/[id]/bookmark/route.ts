import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

// POST /api/docs/chapters/[id]/bookmark — toggle bookmark
export const POST = withAuth(async (req, user, context) => {
  const { id } = await context.params;

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('chapter_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('bookmarks').insert({
      id: `b-${Date.now()}`,
      chapter_id: id,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ message: 'Bookmarked', isBookmarked: true });
  } else {
    await supabase.from('bookmarks').delete().eq('id', existing.id);
    return NextResponse.json({ message: 'Unbookmarked', isBookmarked: false });
  }
});
