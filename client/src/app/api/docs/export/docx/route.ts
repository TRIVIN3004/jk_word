import { NextResponse } from 'next/server';
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

// GET /api/docs/export/docx — export all chapters to docx
export const GET = withAuth(async (req, user) => {
  try {
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .order('order_num');

    if (error) throw error;

    const buffer = await exportChaptersToDocx((chapters || []).map(mapChapter));

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename=document-export.docx',
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return errorResponse('Failed to export document: ' + err.message, 500);
  }
});
