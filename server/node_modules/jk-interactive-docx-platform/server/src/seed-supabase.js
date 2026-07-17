import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createTables = async () => {
  console.log('Checking if Supabase tables exist...');

  // Test if tables exist by selecting from them
  const { error: testErr } = await supabase.from('users').select('id').limit(1);
  if (testErr && testErr.code === 'PGRST205') {
    console.log('\n=========================================================');
    console.log('ACTION REQUIRED: Tables do not exist in Supabase yet!');
    console.log('=========================================================');
    console.log('Please go to your Supabase SQL Editor:');
    console.log('  https://supabase.com/dashboard/project/frqtcthvleusodatlozj/sql/new');
    console.log('\nCopy and paste the contents of this file and run it:');
    console.log('  ' + path.resolve(__dirname, '..', 'data', 'schema.sql'));
    console.log('\nThen run this seed script again: node src/seed-supabase.js');
    return false;
  }

  if (testErr) {
    console.error('Connection error:', testErr.message);
    return false;
  }

  console.log('Tables confirmed to exist!');
  return true;
};

const seed = async () => {
  const tablesOk = await createTables();
  if (!tablesOk) return;

  const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');
  if (!fs.existsSync(DB_FILE)) {
    console.error('db.json not found at', DB_FILE);
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  console.log('Seeding data from db.json...');

  // Clear existing data (order matters due to FK constraints)
  await supabase.from('bookmarks').delete().neq('id', '');
  await supabase.from('notes').delete().neq('id', '');
  await supabase.from('comments').delete().neq('id', '');
  await supabase.from('versions').delete().neq('id', '');
  await supabase.from('chapters').delete().neq('id', '');
  await supabase.from('users').delete().neq('id', '');

  // Seed users
  if (data.users?.length > 0) {
    console.log(`Inserting ${data.users.length} users...`);
    const { error } = await supabase.from('users').insert(data.users);
    if (error) { console.error('Users insert error:', error.message); return; }
  }

  // Seed chapters
  if (data.chapters?.length > 0) {
    console.log(`Inserting ${data.chapters.length} chapters...`);
    const rows = data.chapters.map(c => ({
      id: c.id, title: c.title, category: c.category, content: c.content,
      order_num: c.order, page_count: c.pageCount || 1,
      last_updated: c.lastUpdated || new Date().toISOString()
    }));
    const { error } = await supabase.from('chapters').insert(rows);
    if (error) { console.error('Chapters insert error:', error.message); return; }
  }

  // Seed versions
  if (data.versions?.length > 0) {
    console.log(`Inserting ${data.versions.length} versions...`);
    const rows = data.versions.map(v => ({
      id: v.id, chapter_id: v.chapterId,
      timestamp: v.timestamp || new Date().toISOString(),
      content: v.content, author: v.author, description: v.description
    }));
    const { error } = await supabase.from('versions').insert(rows);
    if (error) { console.error('Versions insert error:', error.message); return; }
  }

  // Seed comments
  if (data.comments?.length > 0) {
    console.log(`Inserting ${data.comments.length} comments...`);
    const rows = data.comments.map(c => ({
      id: c.id, chapter_id: c.chapterId, text: c.text,
      author: c.author || c.user, timestamp: c.timestamp || new Date().toISOString()
    }));
    const { error } = await supabase.from('comments').insert(rows);
    if (error) { console.error('Comments insert error:', error.message); return; }
  }

  // Seed notes
  if (data.notes?.length > 0) {
    console.log(`Inserting ${data.notes.length} notes...`);
    const rows = data.notes.map(n => ({
      id: n.id, chapter_id: n.chapterId, user_id: n.userId || 'unknown',
      text: n.text, author: n.author || 'System', timestamp: n.timestamp || new Date().toISOString()
    }));
    const { error } = await supabase.from('notes').insert(rows);
    if (error) { console.error('Notes insert error:', error.message); return; }
  }

  // Seed bookmarks
  if (data.bookmarks?.length > 0) {
    console.log(`Inserting ${data.bookmarks.length} bookmarks...`);
    const rows = data.bookmarks.map(b => ({
      id: b.id, chapter_id: b.chapterId, user_id: b.userId,
      timestamp: b.timestamp || new Date().toISOString()
    }));
    const { error } = await supabase.from('bookmarks').insert(rows);
    if (error) { console.error('Bookmarks insert error:', error.message); return; }
  }

  console.log('✓ Seeding completed successfully!');
};

seed();
