import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

const mapChapter = (c: any) => ({
  id: c.id, title: c.title, category: c.category,
  order: c.order_num, pageCount: c.page_count, lastUpdated: c.last_updated,
});

// GET /api/docs/chapters
export const GET = withAuth(async () => {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, title, category, order_num, page_count, last_updated')
    .order('order_num');
  if (error) throw error;
  return NextResponse.json((data || []).map(mapChapter));
});
