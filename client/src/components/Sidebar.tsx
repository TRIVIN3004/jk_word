'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronLeft, ChevronRight, Search, Star, History, BookOpen, 
  Settings, ArrowUp, ArrowDown, Edit3, Trash2, Plus, Minimize2, Merge 
} from 'lucide-react';

interface SidebarProps {
  onChaptersRefresh?: () => void;
  chaptersList?: Array<{
    id: string;
    title: string;
    category: string;
    order: number;
  }>;
}

export default function Sidebar({ onChaptersRefresh, chaptersList }: SidebarProps) {
  const { 
    token, favorites, recentPages, fetchWithAuth, user 
  } = useApp();
  const router = useRouter();
  const params = useParams();
  
  const currentChapterId = params?.chapterId as string;

  const [chapters, setChapters] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'toc' | 'favs' | 'recents'>('toc');
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chaptersList) {
      setChapters(chaptersList);
    } else if (token) {
      loadChapters();
    }
  }, [token, chaptersList]);

  const loadChapters = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/docs/chapters');
      setChapters(data);
    } catch (err) {
      console.error("Failed to load sidebar TOC", err);
    } finally {
      setLoading(false);
    }
  };

  // Chapter management actions
  const handleReorder = async (chapterId: string, direction: 'up' | 'down') => {
    const idx = chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return;

    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === chapters.length - 1) return;

    const reordered = [...chapters];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    // Swap
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const payload = reordered.map(c => c.id);

    try {
      setChapters(reordered); // Optimistic UI
      await fetchWithAuth('/docs/chapters/manage', {
        method: 'POST',
        body: { action: 'reorder', payload }
      });
      if (onChaptersRefresh) onChaptersRefresh();
      loadChapters();
    } catch (err) {
      console.error("Reorder failed", err);
    }
  };

  const handleCreateChapter = async () => {
    const title = prompt("Enter New Chapter Title:");
    if (!title) return;

    try {
      const res = await fetchWithAuth('/docs/chapters/manage', {
        method: 'POST',
        body: { action: 'add', payload: { title, category: 'Services' } }
      });
      alert(`✓ Chapter created successfully.`);
      if (onChaptersRefresh) onChaptersRefresh();
      loadChapters();
      router.push(`/viewer/${res.chapter.id}`);
    } catch (err: any) {
      alert(err.message || 'Creation failed');
    }
  };

  const handleDeleteChapter = async (chapterId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete chapter "${title}"?`)) return;

    try {
      await fetchWithAuth('/docs/chapters/manage', {
        method: 'POST',
        body: { action: 'delete', chapterId }
      });
      if (onChaptersRefresh) onChaptersRefresh();
      loadChapters();
      
      // If deleted active, go to dashboard
      if (currentChapterId === chapterId) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Deletion failed');
    }
  };

  const handleMergeChapters = async (sourceId: string) => {
    const targetTitle = prompt("Enter ID of target chapter to merge into:");
    if (!targetTitle) return;

    try {
      await fetchWithAuth('/docs/chapters/manage', {
        method: 'POST',
        body: { action: 'merge', chapterId: sourceId, payload: { targetChapterId: targetTitle } }
      });
      alert('✓ Chapters merged successfully!');
      if (onChaptersRefresh) onChaptersRefresh();
      loadChapters();
    } catch (err: any) {
      alert(err.message || 'Merge failed');
    }
  };

  const handleRenameChapter = async (chapterId: string, oldTitle: string) => {
    const newTitle = prompt("Enter New Chapter Title:", oldTitle);
    if (!newTitle || newTitle === oldTitle) return;

    try {
      await fetchWithAuth('/docs/chapters/manage', {
        method: 'POST',
        body: { action: 'rename', chapterId, payload: { newTitle } }
      });
      if (onChaptersRefresh) onChaptersRefresh();
      loadChapters();
    } catch (err: any) {
      alert(err.message || 'Rename failed');
    }
  };

  // Filter lists based on search query
  const getFilteredList = () => {
    let list = chapters;
    
    if (activeTab === 'favs') {
      list = chapters.filter(c => favorites.includes(c.id));
    } else if (activeTab === 'recents') {
      list = recentPages
        .map(id => chapters.find(c => c.id === id))
        .filter(c => c !== undefined);
    }

    if (searchQuery) {
      list = list.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return list;
  };

  const filteredList = getFilteredList();

  return (
    <aside className={`relative h-[calc(100vh-4rem)] flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]/20 transition-all duration-300 select-none ${collapsed ? 'w-16' : 'w-72'}`}>
      
      {/* Collapse Trigger Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-1/2 -right-3 -translate-y-1/2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-full p-1 border border-slate-600 shadow-md z-30 cursor-pointer"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Main Sidebar Panel contents */}
      {!collapsed ? (
        <>
          {/* Header Title */}
          <div className="p-4 border-b border-[var(--border-color)]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-[var(--text-sidebar-main)]" />
              <span className="font-heading font-extrabold text-sm text-[var(--text-sidebar-main)] tracking-wide">
                Table of Contents
              </span>
            </div>
            
            {user?.role === 'Admin' && (
              <button
                onClick={() => setAdminMode(!adminMode)}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${adminMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'text-[var(--text-sidebar-muted)] border-[var(--border-color)]/20 hover:border-[var(--border-color)]/40 hover:text-[var(--text-sidebar-main)]'}`}
                title="Curator mode"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-sidebar-muted)]">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Filter sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 border border-[var(--border-color)]/30 bg-white/20 dark:bg-slate-950 rounded-xl text-xs text-[var(--text-sidebar-main)] placeholder-[var(--text-sidebar-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Quick tab controls */}
          <div className="px-4 pb-2 border-b border-[var(--border-color)]/20 grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab('toc')}
              className={`py-1 rounded-md text-[10px] uppercase font-bold tracking-wider text-center transition-all ${activeTab === 'toc' ? 'bg-white/60 dark:bg-slate-800 text-[var(--text-sidebar-main)] font-extrabold shadow-sm' : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)]'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('favs')}
              className={`py-1 rounded-md text-[10px] uppercase font-bold tracking-wider text-center flex items-center justify-center gap-1 transition-all ${activeTab === 'favs' ? 'bg-white/60 dark:bg-slate-800 text-[var(--text-sidebar-main)] font-extrabold shadow-sm' : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)]'}`}
            >
              <Star className="h-3 w-3 inline" />
              Favs
            </button>
            <button
              onClick={() => setActiveTab('recents')}
              className={`py-1 rounded-md text-[10px] uppercase font-bold tracking-wider text-center flex items-center justify-center gap-1 transition-all ${activeTab === 'recents' ? 'bg-white/60 dark:bg-slate-800 text-[var(--text-sidebar-main)] font-extrabold shadow-sm' : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)]'}`}
            >
              <History className="h-3 w-3 inline" />
              Recent
            </button>
          </div>

          {/* TOC Chapters lists */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredList.map((ch, index) => {
              const isActive = currentChapterId === ch.id;
              return (
                <div 
                  key={ch.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${isActive ? 'bg-[var(--bg-sidebar-active)] text-white shadow-md font-bold' : 'text-[var(--text-sidebar-muted)] hover:bg-white/10 dark:hover:bg-slate-800/40 hover:text-[var(--text-sidebar-main)]'}`}
                >
                  <div 
                    onClick={() => router.push(`/viewer/${ch.id}`)}
                    className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap pr-2 cursor-pointer"
                    title={ch.title}
                  >
                    <span className={`mr-1.5 font-mono ${isActive ? 'text-white' : 'text-[var(--text-sidebar-muted)]/60'}`}>
                      {ch.order}.
                    </span>
                    {ch.title}
                  </div>

                  {/* Curator mode actions */}
                  {adminMode && user?.role === 'Admin' && (
                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleReorder(ch.id, 'up')}
                        disabled={index === 0}
                        className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3 w-3 text-slate-300" />
                      </button>
                      <button 
                        onClick={() => handleReorder(ch.id, 'down')}
                        disabled={index === chapters.length - 1}
                        className="p-0.5 rounded hover:bg-slate-700 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3 w-3 text-slate-300" />
                      </button>
                      <button 
                        onClick={() => handleRenameChapter(ch.id, ch.title)}
                        className="p-0.5 rounded hover:bg-slate-700"
                        title="Rename"
                      >
                        <Edit3 className="h-3 w-3 text-amber-400" />
                      </button>
                      <button 
                        onClick={() => handleMergeChapters(ch.id)}
                        className="p-0.5 rounded hover:bg-slate-700"
                        title="Merge with other"
                      >
                        <Merge className="h-3 w-3 text-teal-400" />
                      </button>
                      <button 
                        onClick={() => handleDeleteChapter(ch.id, ch.title)}
                        className="p-0.5 rounded hover:bg-slate-700"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Admin Add Chapter */}
            {adminMode && user?.role === 'Admin' && (
              <button
                onClick={handleCreateChapter}
                className="w-full flex items-center justify-center gap-1.5 border border-dashed border-[var(--border-color)]/30 text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)] hover:border-[var(--border-color)] transition-all rounded-xl py-2 mt-4 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Chapter
              </button>
            )}
          </div>
        </>
      ) : (
        /* Collapsed Sidebar */
        <div className="flex flex-col items-center py-6 gap-6">
          <BookOpen className="h-5 w-5 text-[var(--text-sidebar-main)]" />
          
          <div className="h-px w-8 bg-[var(--border-color)]/20" />

          {/* Collapsed icons */}
          <button onClick={() => { setCollapsed(false); setActiveTab('toc'); }} className="p-2 rounded-xl text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)] hover:bg-white/10">
            <BookOpen className="h-5 w-5" />
          </button>
          
          <button onClick={() => { setCollapsed(false); setActiveTab('favs'); }} className="p-2 rounded-xl text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)] hover:bg-white/10">
            <Star className="h-5 w-5" />
          </button>

          <button onClick={() => { setCollapsed(false); setActiveTab('recents'); }} className="p-2 rounded-xl text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar-main)] hover:bg-white/10">
            <History className="h-5 w-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
