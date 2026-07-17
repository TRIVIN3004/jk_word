import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse } from '@/lib/auth';
import { exportChaptersToDocx } from '@/lib/docxExporter';

const mapChapter = (c: any) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  content: c.content,
  order: c.order_num,
  pageCount: c.page_count,
  lastUpdated: c.last_updated,
});

// GET /api/docs/export/docx/[chapterId] — export single chapter to docx
export const GET = withAuth(async (req, user, context) => {
  const { chapterId } = await context.params;

  try {
    const { data: chapter, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .maybeSingle();

    if (error) throw error;
    if (!chapter) return errorResponse('Chapter not found', 404);

    const buffer = await exportChaptersToDocx([mapChapter(chapter)]);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=${chapter.id}-export.docx`,
      },
    });
  } catch (err: any) {
    console.error('Single chapter export error:', err);
    return errorResponse('Failed to export chapter: ' + err.message, 500);
  }
});
