'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, Search, UploadCloud, FileText, Calendar, HardDrive, 
  BarChart3, RefreshCw, Layers, CheckCircle2, User, ChevronRight,
  Users, UserPlus, Trash2, Eye, EyeOff, X
} from 'lucide-react';

interface Stats {
  totalChapters: number;
  totalPages: number;
  completionPercentage: number;
  documentSize: string;
  lastUpdated: string;
  recentUpdates: Array<{
    id: string;
    chapterId: string;
    chapterTitle: string;
    timestamp: string;
    author: string;
    description: string;
  }>;
}

interface Chapter {
  id: string;
  title: string;
  category: string;
  order: number;
  pageCount: number;
  lastUpdated: string;
}

export default function DashboardPage() {
  const { user, token, fetchWithAuth } = useApp();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  // User management state (Admin only)
  const [userList, setUserList] = useState<Array<{id: string; name: string; email: string; role: string}>>([]);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Viewer' });
  const [showPassword, setShowPassword] = useState(false);
  const [userMessage, setUserMessage] = useState({ text: '', type: '' });
  const [userLoading, setUserLoading] = useState(false);

  // Categories list
  const categories = ['All', 'Introduction', 'Services', 'Policies', 'Standards', 'Guidelines', 'References'];

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await fetchWithAuth('/docs/dashboard');
      const chaptersData = await fetchWithAuth('/docs/chapters');
      setStats(statsData);
      setChapters(chaptersData);
    } catch (err: any) {
      console.error("Dashboard load failed", err);
      // Fallback mocks if offline
      setStats({
        totalChapters: 10,
        totalPages: 108,
        completionPercentage: 65,
        documentSize: '154 KB',
        lastUpdated: new Date().toISOString(),
        recentUpdates: [
          { id: '1', chapterId: 'introduction', chapterTitle: 'Introduction', timestamp: new Date().toISOString(), author: 'System Developer', description: 'Seeded handbook contents' }
        ]
      });
      setChapters([
        { id: 'introduction', title: 'Introduction', category: 'Introduction', order: 1, pageCount: 8, lastUpdated: new Date().toISOString() },
        { id: 'company-profile', title: 'Company Profile', category: 'Introduction', order: 2, pageCount: 14, lastUpdated: new Date().toISOString() },
        { id: 'service-1', title: 'Service 1: Cloud Consulting', category: 'Services', order: 3, pageCount: 12, lastUpdated: new Date().toISOString() },
        { id: 'service-2', title: 'Service 2: Cyber Security', category: 'Services', order: 4, pageCount: 15, lastUpdated: new Date().toISOString() },
        { id: 'service-3', title: 'Service 3: AI & Machine Learning', category: 'Services', order: 5, pageCount: 18, lastUpdated: new Date().toISOString() },
        { id: 'service-4', title: 'Service 4: Enterprise Software', category: 'Services', order: 6, pageCount: 11, lastUpdated: new Date().toISOString() },
        { id: 'policies', title: 'Policies', category: 'Policies', order: 7, pageCount: 10, lastUpdated: new Date().toISOString() },
        { id: 'standards', title: 'Standards', category: 'Standards', order: 8, pageCount: 9, lastUpdated: new Date().toISOString() },
        { id: 'guidelines', title: 'Guidelines', category: 'Guidelines', order: 9, pageCount: 8, lastUpdated: new Date().toISOString() },
        { id: 'references', title: 'References', category: 'References', order: 10, pageCount: 6, lastUpdated: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchWithAuth('/auth/users');
      setUserList(data.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      setUserMessage({ text: 'Please fill in all fields.', type: 'error' });
      return;
    }
    setUserLoading(true);
    setUserMessage({ text: '', type: '' });
    try {
      const res = await fetchWithAuth('/auth/users', {
        method: 'POST',
        body: newUser
      });
      setUserMessage({ text: `✓ ${res.user.name} (${res.user.role}) created successfully!`, type: 'success' });
      setNewUser({ name: '', email: '', password: '', role: 'Viewer' });
      loadUsers();
    } catch (err: any) {
      setUserMessage({ text: err.message || 'Failed to create user.', type: 'error' });
    } finally {
      setUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await fetchWithAuth(`/auth/users/${userId}`, { method: 'DELETE' });
      setUserMessage({ text: `User "${userName}" deleted.`, type: 'success' });
      loadUsers();
    } catch (err: any) {
      setUserMessage({ text: err.message || 'Failed to delete user.', type: 'error' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setUploadMessage({ text: 'Error: Only Microsoft Word (.docx) files are supported.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadLoading(true);
      setUploadMessage({ text: 'Parsing document structure, extracting headings...', type: 'info' });
      
      const res = await fetchWithAuth('/docs/import', {
        method: 'POST',
        headers: {
          // fetchWithAuth will append token. Do NOT set Content-Type header so browser sets boundary for multipart
        },
        body: formData
      });

      setUploadMessage({ text: res.message || '✓ Document Imported Successfully!', type: 'success' });
      loadData();
    } catch (err: any) {
      setUploadMessage({ text: err.message || 'Failed to import document.', type: 'error' });
    } finally {
      setUploadLoading(false);
    }
  };

  const filteredChapters = chapters.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Introduction': return 'bg-teal-500/10 text-teal-700 dark:text-teal-300';
      case 'Services': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'Policies': return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'Standards': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'Guidelines': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      case 'References': return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
      default: return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Top welcome banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950/40 p-8 shadow-xl text-white">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-2xl">
            <span className="text-xs uppercase tracking-wider bg-orange-500/20 px-3 py-1 rounded-full text-[#f97316] font-bold border border-orange-500/30">
              Interactive Handbook System
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-heading tracking-tight leading-tight">
              Enterprise Knowledge Base & Documentation
            </h2>
            <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed">
              Explore corporate handbooks, edit guidelines dynamically with auto-saving, manage version controls, and export compiled manuals instantly.
            </p>
          </div>
        </div>

        {/* Dashboard Statistics Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-3 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total Chapters</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">{stats?.totalChapters || '10'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total Pages</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">{stats?.totalPages || '100+'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Document Size</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">{stats?.documentSize || '150 KB'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Reading Progress</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">{stats?.completionPercentage || '70'}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left: Cards Grid with Filters */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="relative w-full md:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  placeholder="Search chapters or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f97316] transition-all"
                />
              </div>
              
              {/* Category selector pills */}
              <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                      activeCategory === cat 
                      ? 'bg-[#f97316] border-[#f97316] text-white font-bold shadow-sm shadow-orange-500/10' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Chapters Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading documentation structure...
              </div>
            ) : filteredChapters.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500">
                No chapters matches your selection or query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => router.push(`/viewer/${ch.id}`)}
                    className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-500/50 dark:hover:border-orange-500/50 hover:shadow-lg shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${getCategoryColor(ch.category)}`}>
                          {ch.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Chapter {ch.order}
                        </span>
                      </div>
                      
                      <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {ch.title}
                      </h3>
                      
                      {/* Short excerpt mockup */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        Interactive portal node containing standards, specifications, and editing checklists.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{ch.pageCount} pages</span>
                      </div>
                      
                      <div className="flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Open Chapter</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Upload widget and Recent edits stack */}
          <div className="space-y-6">
            
            {/* Admin Upload Portal */}
            {user?.role === 'Admin' && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-orange-500" />
                  <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                    Import New Word Document
                  </h3>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload a standard 100+ page Microsoft Word file. The portal parses heading lines (H1/H2) to auto-split it into chapters.
                </p>

                {uploadMessage.text && (
                  <div className={`text-xs px-3 py-2 rounded-xl border ${
                    uploadMessage.type === 'error' ? 'bg-[#f97316]/10 text-orange-600 border-[#f97316]/20' 
                    : uploadMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                  }`}>
                    {uploadMessage.text}
                  </div>
                )}

                <label className={`border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${uploadLoading ? 'pointer-events-none opacity-50' : ''}`}>
                  <input 
                    type="file" 
                    accept=".docx" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose DOCX File</span>
                  <span className="text-[10px] text-slate-400 mt-1">Accepts .docx up to 50MB</span>
                </label>
              </div>
            )}

            {/* User Management Panel (Admin only) */}
            {user?.role === 'Admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Header toggle */}
                <button
                  onClick={() => { setShowUserPanel(v => !v); if (!showUserPanel) loadUsers(); }}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    <span className="font-heading font-bold text-sm text-slate-900 dark:text-white">User Management</span>
                  </div>
                  <span className="text-xs text-slate-400">{showUserPanel ? '▲ Hide' : '▼ Expand'}</span>
                </button>

                {showUserPanel && (
                  <div className="px-5 pb-5 space-y-5 border-t border-slate-100 dark:border-slate-700 pt-4">

                    {/* Feedback message */}
                    {userMessage.text && (
                      <div className={`text-xs px-3 py-2 rounded-xl border flex items-start justify-between gap-2 ${
                        userMessage.type === 'error' ? 'bg-red-500/10 text-red-600 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      }`}>
                        <span>{userMessage.text}</span>
                        <button onClick={() => setUserMessage({ text: '', type: '' })} className="opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                      </div>
                    )}

                    {/* Create User Form */}
                    <form onSubmit={handleCreateUser} className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5 text-orange-500" /> Create New User
                      </h4>

                      <input
                        type="text"
                        placeholder="Full Name"
                        value={newUser.name}
                        onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                        className="block w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        required
                      />

                      <input
                        type="email"
                        placeholder="Email Address"
                        value={newUser.email}
                        onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                        className="block w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        required
                      />

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={newUser.password}
                          onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                          className="block w-full px-3 py-2 pr-9 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <select
                        value={newUser.role}
                        onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                        className="block w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      >
                        <option value="Editor">Editor — Can edit chapters</option>
                        <option value="Viewer">Viewer — Read only</option>
                      </select>

                      <button
                        type="submit"
                        disabled={userLoading}
                        className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {userLoading ? 'Creating...' : 'Create User'}
                      </button>
                    </form>

                    {/* Existing Users List */}
                    {userList.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-orange-500" /> All Users ({userList.length})
                        </h4>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                          {userList.map(u => (
                            <div key={u.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                                  u.role === 'Admin' ? 'bg-red-500/10 text-red-500'
                                  : u.role === 'Editor' ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-slate-500/10 text-slate-500'
                                }`}>{u.role}</span>
                                {u.role !== 'Admin' && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* Recently Edited Checkpoints */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  Recently Edited Checkpoints
                </h3>
              </div>

              {stats && stats.recentUpdates.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {stats.recentUpdates.map((up, idx) => (
                      <li key={up.id}>
                        <div className="relative pb-8">
                          {idx !== stats.recentUpdates.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-700" aria-hidden="true" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {up.author} <span className="font-normal text-slate-500">updated</span> {up.chapterTitle}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {up.description}
                              </p>
                              <time className="text-[9px] text-slate-400 block mt-1 font-semibold">
                                {new Date(up.timestamp).toLocaleString()}
                              </time>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">
                  No checkpoints yet.
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
