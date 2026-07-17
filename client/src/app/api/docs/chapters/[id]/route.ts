import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse, requireEditor } from '@/lib/auth';

const mapChapter = (c: any) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  content: c.content,
  order: c.order_num,
  pageCount: c.page_count,
  lastUpdated: c.last_updated,
});

// GET /api/docs/chapters/[id] — get chapter details with comments, notes, bookmark status
export const GET = withAuth(async (req, user, context) => {
  const { id } = await context.params;

  const [
    { data: chapter, error: chErr },
    { data: comments, error: cmErr },
    { data: notes, error: nErr },
    { data: bookmark }
  ] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', id).maybeSingle(),
    supabase.from('comments').select('*').eq('chapter_id', id).order('timestamp'),
    supabase.from('notes').select('*').eq('chapter_id', id).eq('user_id', user.id),
    supabase.from('bookmarks').select('id').eq('chapter_id', id).eq('user_id', user.id).maybeSingle()
  ]);

  if (chErr) throw chErr;
  if (!chapter) return errorResponse('Chapter not found', 404);

  return NextResponse.json({
    ...mapChapter(chapter),
    comments: (comments || []).map((c: any) => ({
      id: c.id,
      chapterId: c.chapter_id,
      user: c.author,
      text: c.text,
      timestamp: c.timestamp,
    })),
    notes: (notes || []).map((n: any) => ({
      id: n.id,
      chapterId: n.chapter_id,
      text: n.text,
      timestamp: n.timestamp,
    })),
    isBookmarked: !!bookmark,
  });
});

// PUT /api/docs/chapters/[id] — update chapter content (Editor or Admin)
export const PUT = withAuth(async (req, user, context) => {
  requireEditor(user);
  const { id } = await context.params;
  const { content, title, category, changeDescription } = await req.json();

  if (content === undefined) return errorResponse('Content is required', 400);

  const now = new Date().toISOString();
  const approxPageCount = Math.max(1, Math.ceil(content.length / 1500));

  const updates: any = { content, last_updated: now, page_count: approxPageCount };
  if (title) updates.title = title;
  if (category) updates.category = category;

  const { data: chapter, error: updErr } = await supabase
    .from('chapters')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (updErr) throw updErr;
  if (!chapter) return errorResponse('Chapter not found', 404);

  const versionId = `v-${Date.now()}`;
  await supabase.from('versions').insert({
    id: versionId,
    chapter_id: id,
    timestamp: now,
    content,
    author: user.name,
    description: changeDescription || 'Modified content via editor',
  });

  return NextResponse.json({
    message: 'Chapter updated successfully',
    chapter: mapChapter(chapter),
    versionId,
  });
});
