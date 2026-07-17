import express from 'express';
import supabase from '../db.js';
import { verifyToken, isEditor } from '../middleware/auth.js';

const router = express.Router();

// Get version history for a chapter
router.get('/:chapterId', verifyToken, async (req, res) => {
  const { chapterId } = req.params;

  try {
    // Check chapter exists
    const { data: chapter, error: chErr } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .maybeSingle();

    if (chErr) throw chErr;
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const { data: versions, error } = await supabase
      .from('versions')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Map snake_case to camelCase for frontend compatibility
    res.json(versions.map(v => ({
      id: v.id,
      chapterId: v.chapter_id,
      timestamp: v.timestamp,
      content: v.content,
      author: v.author,
      description: v.description
    })));
  } catch (err) {
    console.error('Get versions error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Restore a historical version
router.post('/:chapterId/restore/:versionId', verifyToken, isEditor, async (req, res) => {
  const { chapterId, versionId } = req.params;

  try {
    // Get the version to restore
    const { data: version, error: vErr } = await supabase
      .from('versions')
      .select('*')
      .eq('id', versionId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    if (vErr) throw vErr;
    if (!version) return res.status(404).json({ error: 'Version not found for this chapter' });

    const now = new Date().toISOString();
    const approxPageCount = Math.max(1, Math.ceil(version.content.length / 1500));

    // Update the chapter content
    const { data: updatedChapter, error: updErr } = await supabase
      .from('chapters')
      .update({
        content: version.content,
        last_updated: now,
        page_count: approxPageCount
      })
      .eq('id', chapterId)
      .select()
      .maybeSingle();

    if (updErr) throw updErr;
    if (!updatedChapter) return res.status(404).json({ error: 'Chapter not found' });

    // Log restore as a new version checkpoint
    const newVersionId = `v-restore-${Date.now()}`;
    const { error: insertErr } = await supabase.from('versions').insert({
      id: newVersionId,
      chapter_id: chapterId,
      timestamp: now,
      content: version.content,
      author: req.user.name,
      description: `Restored to version of ${new Date(version.timestamp).toLocaleString()}`
    });

    if (insertErr) throw insertErr;

    res.json({
      message: '✓ Chapter content successfully restored to checkpoint.',
      chapter: {
        ...updatedChapter,
        pageCount: updatedChapter.page_count,
        lastUpdated: updatedChapter.last_updated,
        order: updatedChapter.order_num
      },
      versionId: newVersionId
    });
  } catch (err) {
    console.error('Restore version error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

export default router;
