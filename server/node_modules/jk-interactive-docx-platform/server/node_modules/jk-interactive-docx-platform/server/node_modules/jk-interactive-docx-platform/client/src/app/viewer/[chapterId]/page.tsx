'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import EditorToolbar from '@/components/EditorToolbar';
import { useParams, useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TiptapImage from '@tiptap/extension-image';
import MermaidExtension from '@/components/MermaidExtension';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Star, BookOpen, MessageSquare, 
  StickyNote, History, ZoomIn, ZoomOut, Maximize, Minimize, 
  Save, RotateCcw, AlertCircle, RefreshCw, Send, CheckCircle,
  Download, FileText 
} from 'lucide-react';

interface Version {
  id: string;
  chapterId: string;
  timestamp: string;
  content: string;
  author: string;
  description: string;
}

export default function BookViewerPage() {
  const { user, token, fetchWithAuth, favorites, toggleFavorite, addRecentPage } = useApp();
  const params = useParams();
  const router = useRouter();

  const chapterId = params?.chapterId as string;

  const [chapter, setChapter] = useState<any>(null);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveActive, setAutoSaveActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  
  // Right sidebar panel
  const [rightPanel, setRightPanel] = useState<'comments' | 'notes' | 'versions' | null>(null);

  // Collaboration items state
  const [notesText, setNotesText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [versionsList, setVersionsList] = useState<Version[]>([]);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);

  // Reading progress scroll state
  const [scrollPercent, setScrollPercent] = useState(0);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Initialize TipTap
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: true, HTMLAttributes: { class: 'text-blue-500 underline hover:text-blue-700' } }),
      TiptapImage,
      MermaidExtension
    ],
    content: '<p>Loading contents...</p>',
    editable: false
  });

  // Track scroll position for progress bar
  const handleScroll = () => {
    if (viewerContainerRef.current) {
      const element = viewerContainerRef.current;
      const totalHeight = element.scrollHeight - element.clientHeight;
      if (totalHeight > 0) {
        setScrollPercent(Math.round((element.scrollTop / totalHeight) * 100));
      }
    }
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (chapterId) {
      loadChapterData();
      addRecentPage(chapterId);
    }
    loadChaptersList();
  }, [chapterId, token]);

  // Set editor content and edit permission based on user roles once editor is ready
  useEffect(() => {
    if (editor && !editor.isDestroyed && chapter) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== chapter.content) {
        editor.commands.setContent(chapter.content || '<p>Empty page.</p>');
      }
      if (user) {
        const canEdit = user.role === 'Admin' || user.role === 'Editor';
        editor.setEditable(canEdit);
      }
    }
  }, [editor, chapter, user]);

  // Auto-Save Effect (triggers every 30 seconds if content is dirty)
  useEffect(() => {
    if (!editor || !chapter || (user?.role !== 'Admin' && user?.role !== 'Editor')) return;

    const interval = setInterval(() => {
      const currentHtml = editor.getHTML();
      // Only save if content has actually changed
      if (currentHtml !== chapter.content) {
        setAutoSaveActive(true);
        triggerSave(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [editor, chapter, user]);

  const loadChaptersList = async () => {
    try {
      const list = await fetchWithAuth('/docs/chapters');
      setChaptersList(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChapterData = async () => {
    try {
      setLoading(true);
      setCompareVersion(null);
      const data = await fetchWithAuth(`/docs/chapters/${chapterId}`);
      setChapter(data);
      setCommentsList(data.comments || []);
      setNotesText(data.notes?.[0]?.text || '');

      if (editor) {
        editor.commands.setContent(data.content || '<p>Empty page.</p>');
      }

      // Load versions history stack
      const versions = await fetchWithAuth(`/versions/${chapterId}`);
      setVersionsList(versions);

    } catch (err) {
      console.error("Failed to load chapter content", err);
      // Offline fallback
      const mockContent = `
        <h1>Mock Server Offline</h1>
        <p>This is a simulated handbook chapter displayed because the local Express backend server is offline.</p>
        <p>Start the server in your terminal by running <code>npm run dev</code> inside the workspace root.</p>
      `;
      setChapter({
        id: chapterId,
        title: chapterId.replace(/-/g, ' ').toUpperCase(),
        category: 'Services',
        content: mockContent,
        order: 1,
        pageCount: 5,
        lastUpdated: new Date().toISOString()
      });
      if (editor) {
        editor.commands.setContent(mockContent);
      }
    } finally {
      setLoading(false);
    }
  };

  // Perform document save
  const triggerSave = async (isAuto = false) => {
    if (!editor || !chapter) return;
    setSaveStatus('saving');
    
    try {
      const htmlContent = editor.getHTML();
      await fetchWithAuth(`/docs/chapters/${chapterId}`, {
        method: 'PUT',
        body: {
          content: htmlContent,
          changeDescription: isAuto ? 'Auto-saved system snapshot' : 'Manual document update'
        }
      });
      
      setSaveStatus('saved');
      // Update local baseline content to avoid redundant auto-saves
      setChapter((prev: any) => ({ ...prev, content: htmlContent }));
      
      // Reload versions history list
      const versions = await fetchWithAuth(`/versions/${chapterId}`);
      setVersionsList(versions);

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setAutoSaveActive(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const freshComment = await fetchWithAuth(`/docs/chapters/${chapterId}/comments`, {
        method: 'POST',
        body: { text: commentText }
      });
      setCommentsList(prev => [...prev, freshComment]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await fetchWithAuth(`/docs/chapters/${chapterId}/notes`, {
        method: 'POST',
        body: { text: notesText }
      });
      alert('✓ Notes saved successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore the document to this version? Your current unsaved inputs will be overwritten.')) return;

    try {
      setLoading(true);
      const res = await fetchWithAuth(`/versions/${chapterId}/restore/${versionId}`, {
        method: 'POST'
      });
      alert(res.message);
      loadChapterData();
    } catch (err: any) {
      alert(err.message || 'Restoration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Navigations pagination helper
  const navigateChapter = (direction: 'prev' | 'next') => {
    if (chaptersList.length === 0 || !chapter) return;
    const sorted = [...chaptersList].sort((a, b) => a.order - b.order);
    const currIndex = sorted.findIndex(c => c.id === chapter.id);

    if (direction === 'prev' && currIndex > 0) {
      router.push(`/viewer/${sorted[currIndex - 1].id}`);
    } else if (direction === 'next' && currIndex < sorted.length - 1) {
      router.push(`/viewer/${sorted[currIndex + 1].id}`);
    }
  };

  const exportDocxFile = async () => {
    try {
      const blob = await fetchWithAuth('/docs/export/docx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `full-document-export.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download full Word document.');
    }
  };

  const exportSingleChapter = async () => {
    try {
      const blob = await fetchWithAuth(`/docs/export/docx/${chapterId}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapter?.title || 'chapter'}-export.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download this chapter.');
    }
  };

  const currentIdx = chaptersList.findIndex(c => c.id === chapterId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx !== -1 && currentIdx < chaptersList.length - 1;

  const fontSizingStyle = {
    fontSize: `${(zoomLevel / 100) * 1}rem`,
    lineHeight: '1.75'
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${fullscreen ? 'bg-white dark:bg-slate-900 z-50 fixed inset-0' : ''}`}>
      {!fullscreen && <Header />}

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left TOC Navigation Sidebar */}
        <Sidebar onChaptersRefresh={loadChaptersList} chaptersList={chaptersList} />

        {/* Center Main Book Viewer Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900/40 relative">
          
          {/* Top Panel Actions (Sticky actions) */}
          <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-6 flex items-center justify-between gap-4 select-none shrink-0 transition-colors">
            
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
              <span className="hover:text-blue-500 cursor-pointer" onClick={() => router.push('/dashboard')}>Dashboard</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span>{chapter?.category || 'Documentation'}</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-slate-800 dark:text-slate-200 truncate">{chapter?.title || 'Chapter'}</span>
            </div>

            {/* Read/Edit & View control bar */}
            <div className="flex items-center gap-2">
              
              {/* Zoom Panel */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl gap-0.5">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))} 
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 px-2 min-w-10 text-center">
                  {zoomLevel}%
                </span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))} 
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Fullscreen Reading Toggle */}
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
                title="Fullscreen Toggle"
              >
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>

              {/* Bookmarking Star */}
              <button
                onClick={() => chapter && toggleFavorite(chapter.id)}
                className={`p-2 rounded-xl border transition-colors ${
                  favorites.includes(chapterId) 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 border-slate-200 dark:border-slate-700'
                }`}
                title={favorites.includes(chapterId) ? "Remove Bookmark" : "Place Bookmark"}
              >
                <Star className="h-4 w-4 fill-current" />
              </button>

              {/* Editor Save Controls (only if editor role) */}
              {(user?.role === 'Admin' || user?.role === 'Editor') && (
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Changes saved
                    </span>
                  )}
                  
                  <button
                    onClick={() => triggerSave(false)}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5 text-white font-bold" />
                    Save
                  </button>
                </div>
              )}

              {/* Export Options */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={exportSingleChapter}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors"
                  title="Download only this page"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Download Page
                </button>
                <button
                  onClick={exportDocxFile}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  title="Download entire book"
                >
                  <Download className="h-3.5 w-3.5 text-white font-bold" />
                  Download Full Book
                </button>
              </div>
            </div>
          </div>

          {/* Reading Scroll Progress Bar */}
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-150" 
              style={{ width: `${scrollPercent}%` }}
            />
          </div>

          {/* Editor sticky formatting bar (only editable users) */}
          {editor && editor.isEditable && (
            <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-800/50">
              <EditorToolbar editor={editor} />
            </div>
          )}

          {/* Chapters content editor zone */}
          <div 
            ref={viewerContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 md:p-10"
          >
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800/80 p-8 md:p-12 rounded-3xl border border-slate-200/60 dark:border-slate-700 shadow-sm min-h-[500px]">
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mb-2" />
                  <span className="text-xs font-semibold tracking-wider">Syncing Document Content...</span>
                </div>
              ) : (
                /* Chapters contents container */
                <article style={fontSizingStyle} className="transition-all duration-200">
                  <EditorContent editor={editor} />
                </article>
              )}
            </div>

            {/* Footer nav buttons */}
            <div className="max-w-3xl mx-auto mt-6 flex justify-between items-center select-none pb-12">
              <button
                onClick={() => navigateChapter('prev')}
                disabled={!hasPrev}
                className="flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Chapter
              </button>

              <span className="text-xs font-bold text-slate-400">
                Page {chapter?.order || 1} of {chaptersList.length}
              </span>

              <button
                onClick={() => navigateChapter('next')}
                disabled={!hasNext}
                className="flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Next Chapter
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Floating Actions sidebar toggle tabs (Vertical sidebar) */}
          <div className="absolute right-4 top-20 flex flex-col gap-2 z-20 select-none">
            <button
              onClick={() => setRightPanel(rightPanel === 'comments' ? null : 'comments')}
              className={`p-2.5 rounded-xl border shadow-md transition-colors bg-white dark:bg-slate-800 ${rightPanel === 'comments' ? 'text-blue-500 border-blue-500/40' : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
              title="Discussion panel"
            >
              <MessageSquare className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setRightPanel(rightPanel === 'notes' ? null : 'notes')}
              className={`p-2.5 rounded-xl border shadow-md transition-colors bg-white dark:bg-slate-800 ${rightPanel === 'notes' ? 'text-amber-500 border-amber-500/40' : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
              title="Personal notes"
            >
              <StickyNote className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setRightPanel(rightPanel === 'versions' ? null : 'versions')}
              className={`p-2.5 rounded-xl border shadow-md transition-colors bg-white dark:bg-slate-800 ${rightPanel === 'versions' ? 'text-purple-500 border-purple-500/40' : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'}`}
              title="Version history checkpoints"
            >
              <History className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Right Drawer Panel (Slides out dynamically) */}
        <AnimatePresence>
          {rightPanel && (
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="w-80 h-[calc(100vh-4rem)] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col z-30 shrink-0 select-none shadow-xl"
            >
              
              {/* Tab Content 1: Discussion/Comments */}
              {rightPanel === 'comments' && (
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-heading font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      Discussions Feed
                    </span>
                    <button onClick={() => setRightPanel(null)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
                  </div>
                  
                  {/* Comments lists */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {commentsList.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-medium">
                        No discussion threads. Write a comment to kickstart collaboration.
                      </div>
                    ) : (
                      commentsList.map((comm) => (
                        <div key={comm.id} className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{comm.user}</span>
                            <span className="text-slate-400 font-semibold">{new Date(comm.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">{comm.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment input form */}
                  <form onSubmit={handleAddComment} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 flex gap-2">
                    <input
                      type="text"
                      placeholder="Write comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab Content 2: Personal Notes */}
              {rightPanel === 'notes' && (
                <div className="flex flex-col h-full p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-heading font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      Personal Notes
                    </span>
                    <button onClick={() => setRightPanel(null)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Write thoughts or highlights. Notes are confidential and associated only with your profile.
                  </p>

                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Capture your workflow ideas here..."
                    className="flex-1 w-full p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs rounded-2xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-light leading-relaxed resize-none"
                  />

                  <button
                    onClick={handleSaveNotes}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Save Notes
                  </button>
                </div>
              )}

              {/* Tab Content 3: Version History stack */}
              {rightPanel === 'versions' && (
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-heading font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      Edit Checkpoints
                    </span>
                    <button onClick={() => setRightPanel(null)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {versionsList.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs">
                        No previous checkpoints available.
                      </div>
                    ) : (
                      versionsList.map((ver) => (
                        <div key={ver.id} className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block">{ver.author}</span>
                              <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">{new Date(ver.timestamp).toLocaleString()}</span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-500 font-bold rounded-md">
                              {ver.id.substring(0, 8)}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal italic font-medium">
                            "{ver.description}"
                          </p>

                          <div className="pt-2 flex gap-1.5">
                            <button
                              onClick={() => setCompareVersion(ver)}
                              className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-[9px] transition-colors"
                            >
                              Compare Text
                            </button>
                            {(user?.role === 'Admin' || user?.role === 'Editor') && (
                              <button
                                onClick={() => handleRestoreVersion(ver.id)}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[9px] transition-colors"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Visual compare Modal */}
      {compareVersion && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl h-[550px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white">
                  Comparing Historical Content Checkpoint
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Checkpoint {compareVersion.id.substring(0, 8)} edited by {compareVersion.author} on {new Date(compareVersion.timestamp).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setCompareVersion(null)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Split Screen Diff details */}
            <div className="flex-1 flex divide-x divide-slate-200 dark:divide-slate-700 overflow-hidden text-xs">
              <div className="w-1/2 flex flex-col overflow-hidden">
                <span className="p-2 bg-red-500/10 text-red-600 font-bold border-b border-slate-200 dark:border-slate-700 block shrink-0 text-[10px] uppercase tracking-wider">
                  Historical Checkpoint Text (Plain)
                </span>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {compareVersion.content.replace(/<[^>]*>/g, '')}
                </div>
              </div>

              <div className="w-1/2 flex flex-col overflow-hidden">
                <span className="p-2 bg-emerald-500/10 text-emerald-600 font-bold border-b border-slate-200 dark:border-slate-700 block shrink-0 text-[10px] uppercase tracking-wider">
                  Active Document Text (Plain)
                </span>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
                  {editor?.getHTML().replace(/<[^>]*>/g, '')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
