import express from 'express';
import multer from 'multer';
import supabase from '../db.js';
import { verifyToken, isEditor, isAdmin } from '../middleware/auth.js';
import { parseDocxToChapters } from '../utils/docxParser.js';
import { exportChaptersToDocx } from '../utils/docxExporter.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: map DB row -> frontend-friendly object
const mapChapter = (c) => ({
  id: c.id,
  title: c.title,
  category: c.category,
  content: c.content,
  order: c.order_num,
  pageCount: c.page_count,
  lastUpdated: c.last_updated
});

// ──────────────────────────────────────────────────
// 1. Dashboard Statistics
// ──────────────────────────────────────────────────
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const [{ count: totalChapters }, { data: chapters }, { data: versions }, { count: bookmarksCount }, { count: notesCount }] = await Promise.all([
      supabase.from('chapters').select('*', { count: 'exact', head: true }),
      supabase.from('chapters').select('page_count, last_updated'),
      supabase.from('versions').select('id, chapter_id, timestamp, author, description').order('timestamp', { ascending: false }).limit(5),
      supabase.from('bookmarks').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true })
    ]);

    const totalPages = (chapters || []).reduce((acc, c) => acc + (c.page_count || 1), 0);
    const completionPercentage = Math.min(100, Math.round(50 + ((bookmarksCount || 0) + (notesCount || 0)) * 5));

    // Fetch chapter titles for recent updates
    const chapterIds = [...new Set((versions || []).map(v => v.chapter_id))];
    const { data: chapterTitles } = await supabase
      .from('chapters')
      .select('id, title')
      .in('id', chapterIds);

    const titleMap = Object.fromEntries((chapterTitles || []).map(c => [c.id, c.title]));

    const recentUpdates = (versions || []).map(v => ({
      id: v.id,
      chapterId: v.chapter_id,
      chapterTitle: titleMap[v.chapter_id] || 'Deleted Chapter',
      timestamp: v.timestamp,
      author: v.author,
      description: v.description
    }));

    const lastUpdated = (chapters || []).reduce((latest, c) => {
      return new Date(c.last_updated) > new Date(latest) ? c.last_updated : latest;
    }, '2026-01-01T00:00:00Z');

    res.json({ totalChapters, totalPages, completionPercentage, documentSize: `${(totalPages * 2.5).toFixed(2)} KB`, lastUpdated, recentUpdates });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 2. List Chapters (TOC)
// ──────────────────────────────────────────────────
router.get('/chapters', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('id, title, category, order_num, page_count, last_updated')
      .order('order_num');

    if (error) throw error;
    res.json((data || []).map(mapChapter));
  } catch (err) {
    console.error('List chapters error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 3. Get Chapter Details
// ──────────────────────────────────────────────────
router.get('/chapters/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [{ data: chapter, error: chErr }, { data: comments, error: cmErr }, { data: notes, error: nErr }, { data: bookmark }] = await Promise.all([
      supabase.from('chapters').select('*').eq('id', id).maybeSingle(),
      supabase.from('comments').select('*').eq('chapter_id', id).order('timestamp'),
      supabase.from('notes').select('*').eq('chapter_id', id).eq('user_id', req.user.id),
      supabase.from('bookmarks').select('id').eq('chapter_id', id).eq('user_id', req.user.id).maybeSingle()
    ]);

    if (chErr) throw chErr;
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    res.json({
      ...mapChapter(chapter),
      comments: (comments || []).map(c => ({ id: c.id, chapterId: c.chapter_id, user: c.author, text: c.text, timestamp: c.timestamp })),
      notes: (notes || []).map(n => ({ id: n.id, chapterId: n.chapter_id, text: n.text, timestamp: n.timestamp })),
      isBookmarked: !!bookmark
    });
  } catch (err) {
    console.error('Get chapter error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 4. Update Chapter Content (Editor or Admin)
// ──────────────────────────────────────────────────
router.put('/chapters/:id', verifyToken, isEditor, async (req, res) => {
  const { id } = req.params;
  const { content, title, category, changeDescription } = req.body;

  if (content === undefined) return res.status(400).json({ error: 'Content is required' });

  try {
    const now = new Date().toISOString();
    const approxPageCount = Math.max(1, Math.ceil(content.length / 1500));

    const updates = { content, last_updated: now, page_count: approxPageCount };
    if (title) updates.title = title;
    if (category) updates.category = category;

    const { data: chapter, error: updErr } = await supabase
      .from('chapters').update(updates).eq('id', id).select().maybeSingle();

    if (updErr) throw updErr;
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const versionId = `v-${Date.now()}`;
    await supabase.from('versions').insert({
      id: versionId,
      chapter_id: id,
      timestamp: now,
      content,
      author: req.user.name,
      description: changeDescription || 'Modified content via editor'
    });

    res.json({ message: 'Chapter updated successfully', chapter: mapChapter(chapter), versionId });
  } catch (err) {
    console.error('Update chapter error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 5. Upload & Import DOCX (Admin only)
// ──────────────────────────────────────────────────
router.post('/import', verifyToken, isAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const chapters = await parseDocxToChapters(req.file.buffer);

    // Delete all existing chapters (cascade deletes versions/comments/notes/bookmarks)
    await supabase.from('chapters').delete().neq('id', '');

    // Insert new chapters
    const chapterRows = chapters.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      content: c.content,
      order_num: c.order,
      page_count: c.pageCount || 1,
      last_updated: c.lastUpdated || new Date().toISOString()
    }));
    await supabase.from('chapters').insert(chapterRows);

    // Insert initial versions
    const versionRows = chapters.map(c => ({
      id: `v-import-${c.id}`,
      chapter_id: c.id,
      timestamp: c.lastUpdated || new Date().toISOString(),
      content: c.content,
      author: req.user.name,
      description: `Imported from Word: ${req.file.originalname}`
    }));
    await supabase.from('versions').insert(versionRows);

    res.json({
      message: `✓ Document parsed and imported successfully. Extracted ${chapters.length} chapters.`,
      chapters: chapters.map(c => ({ id: c.id, title: c.title, order: c.order }))
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to parse and import Word document.' });
  }
});

// ──────────────────────────────────────────────────
// 6. Manage Chapters (Admin only)
// ──────────────────────────────────────────────────
router.post('/chapters/manage', verifyToken, isAdmin, async (req, res) => {
  const { action, chapterId, payload } = req.body;

  try {
    if (action === 'reorder') {
      if (!Array.isArray(payload)) return res.status(400).json({ error: 'Payload must be an array of IDs' });
      await Promise.all(payload.map((id, index) =>
        supabase.from('chapters').update({ order_num: index + 1 }).eq('id', id)
      ));
      return res.json({ message: 'Chapters reordered successfully' });
    }

    if (action === 'rename') {
      const { newTitle } = payload;
      if (!newTitle) return res.status(400).json({ error: 'New title required' });
      const { data: ch, error } = await supabase
        .from('chapters').update({ title: newTitle, last_updated: new Date().toISOString() })
        .eq('id', chapterId).select().maybeSingle();
      if (error) throw error;
      if (!ch) return res.status(404).json({ error: 'Chapter not found' });
      return res.json({ message: 'Chapter renamed successfully', chapter: mapChapter(ch) });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (error) throw error;
      return res.json({ message: 'Chapter deleted successfully' });
    }

    if (action === 'add') {
      const { title, category } = payload;
      if (!title) return res.status(400).json({ error: 'Title required' });

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
        last_updated: now
      };

      const { error: insErr } = await supabase.from('chapters').insert(newChapter);
      if (insErr) throw insErr;

      await supabase.from('versions').insert({
        id: `v-create-${newId}`,
        chapter_id: newId,
        timestamp: now,
        content: newChapter.content,
        author: req.user.name,
        description: 'Created empty chapter'
      });

      return res.json({ message: 'Chapter added successfully', chapter: mapChapter(newChapter) });
    }

    if (action === 'merge') {
      const { targetChapterId } = payload;
      const [{ data: source }, { data: target }] = await Promise.all([
        supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle(),
        supabase.from('chapters').select('*').eq('id', targetChapterId).maybeSingle()
      ]);

      if (!source || !target) return res.status(404).json({ error: 'Source or target chapter not found' });

      const mergedContent = `${target.content}\n<hr/>\n<h2>Merged: ${source.title}</h2>\n${source.content}`;
      const now = new Date().toISOString();

      await supabase.from('chapters').update({
        content: mergedContent,
        page_count: target.page_count + source.page_count,
        last_updated: now
      }).eq('id', targetChapterId);

      await supabase.from('chapters').delete().eq('id', chapterId);

      await supabase.from('versions').insert({
        id: `v-merge-${targetChapterId}-${Date.now()}`,
        chapter_id: targetChapterId,
        timestamp: now,
        content: mergedContent,
        author: req.user.name,
        description: `Merged with chapter: ${source.title}`
      });

      return res.json({ message: 'Chapters merged successfully' });
    }

    res.status(400).json({ error: 'Invalid management action' });
  } catch (err) {
    console.error('Manage chapters error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 7. Bookmarks toggle
// ──────────────────────────────────────────────────
router.post('/chapters/:id/bookmark', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing } = await supabase
      .from('bookmarks').select('id').eq('chapter_id', id).eq('user_id', req.user.id).maybeSingle();

    if (!existing) {
      await supabase.from('bookmarks').insert({ id: `b-${Date.now()}`, chapter_id: id, user_id: req.user.id, timestamp: new Date().toISOString() });
      return res.json({ message: 'Bookmarked', isBookmarked: true });
    } else {
      await supabase.from('bookmarks').delete().eq('id', existing.id);
      return res.json({ message: 'Unbookmarked', isBookmarked: false });
    }
  } catch (err) {
    console.error('Bookmark error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// Get all Bookmarks for User
router.get('/bookmarks', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('chapter_id, chapters(id, title)')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json((data || []).filter(b => b.chapters).map(b => ({ id: b.chapters.id, title: b.chapters.title })));
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 8. Comments
// ──────────────────────────────────────────────────
router.post('/chapters/:id/comments', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: 'Comment text required' });

  try {
    const comment = { id: `c-${Date.now()}`, chapter_id: id, author: req.user.name, text, timestamp: new Date().toISOString() };
    const { error } = await supabase.from('comments').insert(comment);
    if (error) throw error;
    res.status(201).json({ id: comment.id, chapterId: id, user: comment.author, text, timestamp: comment.timestamp });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 9. Notes
// ──────────────────────────────────────────────────
router.post('/chapters/:id/notes', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    const { data: existing } = await supabase
      .from('notes').select('id').eq('chapter_id', id).eq('user_id', req.user.id).maybeSingle();

    if (!existing) {
      const note = { id: `n-${Date.now()}`, chapter_id: id, user_id: req.user.id, author: req.user.name, text, timestamp: new Date().toISOString() };
      const { error } = await supabase.from('notes').insert(note);
      if (error) throw error;
      return res.status(201).json({ id: note.id, chapterId: id, text, timestamp: note.timestamp });
    } else {
      const now = new Date().toISOString();
      const { error } = await supabase.from('notes').update({ text, timestamp: now }).eq('id', existing.id);
      if (error) throw error;
      return res.json({ id: existing.id, chapterId: id, text, timestamp: now });
    }
  } catch (err) {
    console.error('Note error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// 10. Export all chapters to DOCX
// ──────────────────────────────────────────────────
router.get('/export/docx', verifyToken, async (req, res) => {
  try {
    const { data: chapters, error } = await supabase.from('chapters').select('*').order('order_num');
    if (error) throw error;
    const buffer = await exportChaptersToDocx((chapters || []).map(mapChapter));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=document-export.docx');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export document.' });
  }
});

// ──────────────────────────────────────────────────
// 11. Export single chapter to DOCX
// ──────────────────────────────────────────────────
router.get('/export/docx/:chapterId', verifyToken, async (req, res) => {
  try {
    const { data: chapter, error } = await supabase.from('chapters').select('*').eq('id', req.params.chapterId).maybeSingle();
    if (error) throw error;
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    const buffer = await exportChaptersToDocx([mapChapter(chapter)]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${chapter.id}-export.docx`);
    res.send(buffer);
  } catch (err) {
    console.error('Single chapter export error:', err);
    res.status(500).json({ error: 'Failed to export chapter.' });
  }
});

export default router;
