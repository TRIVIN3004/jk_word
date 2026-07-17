import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

const mapChapter = (c: any) => ({
  id: c.id, title: c.title, category: c.category, content: c.content,
  order: c.order_num, pageCount: c.page_count, lastUpdated: c.last_updated,
});

// GET /api/docs/dashboard
export const GET = withAuth(async () => {
  const [
    { count: totalChapters },
    { data: chapters },
    { data: versions },
    { count: bookmarksCount },
    { count: notesCount },
  ] = await Promise.all([
    supabase.from('chapters').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('page_count, last_updated'),
    supabase.from('versions').select('id, chapter_id, timestamp, author, description').order('timestamp', { ascending: false }).limit(5),
    supabase.from('bookmarks').select('*', { count: 'exact', head: true }),
    supabase.from('notes').select('*', { count: 'exact', head: true }),
  ]);

  const totalPages = (chapters || []).reduce((acc: number, c: any) => acc + (c.page_count || 1), 0);
  const completionPercentage = Math.min(100, Math.round(50 + ((bookmarksCount || 0) + (notesCount || 0)) * 5));

  const chapterIds = [...new Set((versions || []).map((v: any) => v.chapter_id))];
  const { data: chapterTitles } = chapterIds.length
    ? await supabase.from('chapters').select('id, title').in('id', chapterIds)
    : { data: [] };

  const titleMap = Object.fromEntries((chapterTitles || []).map((c: any) => [c.id, c.title]));

  const recentUpdates = (versions || []).map((v: any) => ({
    id: v.id, chapterId: v.chapter_id,
    chapterTitle: titleMap[v.chapter_id] || 'Deleted Chapter',
    timestamp: v.timestamp, author: v.author, description: v.description,
  }));

  const lastUpdated = (chapters || []).reduce((latest: string, c: any) =>
    new Date(c.last_updated) > new Date(latest) ? c.last_updated : latest, '2026-01-01T00:00:00Z');

  return NextResponse.json({ totalChapters, totalPages, completionPercentage, documentSize: `${(totalPages * 2.5).toFixed(2)} KB`, lastUpdated, recentUpdates });
});
