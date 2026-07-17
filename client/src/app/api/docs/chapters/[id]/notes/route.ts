import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

// POST /api/docs/chapters/[id]/notes — add or update note
export const POST = withAuth(async (req, user, context) => {
  const { id } = await context.params;
  const { text } = await req.json();

  const { data: existing } = await supabase
    .from('notes')
    .select('id')
    .eq('chapter_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    const note = {
      id: `n-${Date.now()}`,
      chapter_id: id,
      user_id: user.id,
      author: user.name,
      text,
      timestamp: new Date().toISOString(),
    };
    const { error } = await supabase.from('notes').insert(note);
    if (error) throw error;
    return NextResponse.json({ id: note.id, chapterId: id, text, timestamp: note.timestamp }, { status: 201 });
  } else {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notes')
      .update({ text, timestamp: now })
      .eq('id', existing.id);
    if (error) throw error;
    return NextResponse.json({ id: existing.id, chapterId: id, text, timestamp: now });
  }
});
