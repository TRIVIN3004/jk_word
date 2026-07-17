import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse, requireAdmin } from '@/lib/auth';

const mapChapter = (c: any) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  content: c.content,
  order: c.order_num,
  pageCount: c.page_count,
  lastUpdated: c.last_updated,
});

// POST /api/docs/chapters/manage — admin tasks (reorder, rename, delete, add, merge)
export const POST = withAuth(async (req, user) => {
  requireAdmin(user);
  const { action, chapterId, payload } = await req.json();

  if (action === 'reorder') {
    if (!Array.isArray(payload)) return errorResponse('Payload must be an array of IDs', 400);
    await Promise.all(
      payload.map((id: string, index: number) =>
        supabase.from('chapters').update({ order_num: index + 1 }).eq('id', id)
      )
    );
    return NextResponse.json({ message: 'Chapters reordered successfully' });
  }

  if (action === 'rename') {
    const { newTitle } = payload || {};
    if (!newTitle) return errorResponse('New title required', 400);
    const { data: ch, error } = await supabase
      .from('chapters')
      .update({ title: newTitle, last_updated: new Date().toISOString() })
      .eq('id', chapterId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!ch) return errorResponse('Chapter not found', 404);
    return NextResponse.json({ message: 'Chapter renamed successfully', chapter: mapChapter(ch) });
  }

  if (action === 'delete') {
    const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
    if (error) throw error;
    return NextResponse.json({ message: 'Chapter deleted successfully' });
  }

  if (action === 'add') {
    const { title, category } = payload || {};
    if (!title) return errorResponse('Title required', 400);

    const { count } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
    const newId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `chapter-${Date.now()}`;
    const now = new Date().toISOString();

    const newChapter = {
      id: newId,
      title,
      category: category || 'Services',
      content: `<h1>${title}</h1><p>Start writing content here...</p>`,
      order_num: (count || 0) + 1,
      page_count: 1,
      last_updated: now,
    };

    const { error: insErr } = await supabase.from('chapters').insert(newChapter);
    if (insErr) throw insErr;

    await supabase.from('versions').insert({
      id: `v-create-${newId}`,
      chapter_id: newId,
      timestamp: now,
      content: newChapter.content,
      author: user.name,
      description: 'Created empty chapter',
    });

    return NextResponse.json({ message: 'Chapter added successfully', chapter: mapChapter(newChapter) });
  }

  if (action === 'merge') {
    const { targetChapterId } = payload || {};
    const [
      { data: source },
      { data: target }
    ] = await Promise.all([
      supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle(),
      supabase.from('chapters').select('*').eq('id', targetChapterId).maybeSingle()
    ]);

    if (!source || !target) return errorResponse('Source or target chapter not found', 404);

    const mergedContent = `${target.content}\n<hr/>\n<h2>Merged: ${source.title}</h2>\n${source.content}`;
    const now = new Date().toISOString();

    await supabase.from('chapters').update({
      content: mergedContent,
      page_count: target.page_count + source.page_count,
      last_updated: now,
    }).eq('id', targetChapterId);

    await supabase.from('chapters').delete().eq('id', chapterId);

    await supabase.from('versions').insert({
      id: `v-merge-${targetChapterId}-${Date.now()}`,
      chapter_id: targetChapterId,
      timestamp: now,
      content: mergedContent,
      author: user.name,
      description: `Merged with chapter: ${source.title}`,
    });

    return NextResponse.json({ message: 'Chapters merged successfully' });
  }

  return errorResponse('Invalid management action', 400);
});
