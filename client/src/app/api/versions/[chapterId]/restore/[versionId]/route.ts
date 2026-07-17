import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth, errorResponse, requireEditor } from '@/lib/auth';

// POST /api/versions/[chapterId]/restore/[versionId] — restore a version
export const POST = withAuth(async (req, user, context) => {
  requireEditor(user);
  const { chapterId, versionId } = await context.params;

  // Get the version to restore
  const { data: version, error: vErr } = await supabase
    .from('versions')
    .select('*')
    .eq('id', versionId)
    .eq('chapter_id', chapterId)
    .maybeSingle();

  if (vErr) throw vErr;
  if (!version) return errorResponse('Version not found for this chapter', 404);

  const now = new Date().toISOString();
  const approxPageCount = Math.max(1, Math.ceil(version.content.length / 1500));

  // Update the chapter content
  const { data: updatedChapter, error: updErr } = await supabase
    .from('chapters')
    .update({
      content: version.content,
      last_updated: now,
      page_count: approxPageCount,
    })
    .eq('id', chapterId)
    .select()
    .maybeSingle();

  if (updErr) throw updErr;
  if (!updatedChapter) return errorResponse('Chapter not found', 404);

  // Log restore as a new version checkpoint
  const newVersionId = `v-restore-${Date.now()}`;
  const { error: insertErr } = await supabase.from('versions').insert({
    id: newVersionId,
    chapter_id: chapterId,
    timestamp: now,
    content: version.content,
    author: user.name,
    description: `Restored to version of ${new Date(version.timestamp).toLocaleString()}`,
  });

  if (insertErr) throw insertErr;

  return NextResponse.json({
    message: '✓ Chapter content successfully restored to checkpoint.',
    chapter: {
      ...updatedChapter,
      pageCount: updatedChapter.page_count,
      lastUpdated: updatedChapter.last_updated,
      order: updatedChapter.order_num,
    },
    versionId: newVersionId,
  });
});
