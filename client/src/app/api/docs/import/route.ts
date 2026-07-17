import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse, requireAdmin } from '@/lib/auth';
import { parseDocxToChapters } from '@/lib/docxParser';

export const POST = withAuth(async (req, user) => {
  requireAdmin(user);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const chapters = await parseDocxToChapters(buffer);

    // Delete all existing chapters (cascade deletes versions/comments/notes/bookmarks)
    await supabase.from('chapters').delete().neq('id', '');

    // Insert new chapters
    const chapterRows = chapters.map((c: any) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      content: c.content,
      order_num: c.order,
      page_count: c.pageCount || 1,
      last_updated: c.lastUpdated || new Date().toISOString(),
    }));
    await supabase.from('chapters').insert(chapterRows);

    // Insert initial versions
    const versionRows = chapters.map((c: any) => ({
      id: `v-import-${c.id}`,
      chapter_id: c.id,
      timestamp: c.lastUpdated || new Date().toISOString(),
      content: c.content,
      author: user.name,
      description: `Imported from Word: ${file.name}`,
    }));
    await supabase.from('versions').insert(versionRows);

    return NextResponse.json({
      message: `✓ Document parsed and imported successfully. Extracted ${chapters.length} chapters.`,
      chapters: chapters.map((c: any) => ({ id: c.id, title: c.title, order: c.order })),
    });
  } catch (err: any) {
    console.error('Import error:', err);
    return errorResponse('Failed to parse and import Word document: ' + err.message, 500);
  }
});
