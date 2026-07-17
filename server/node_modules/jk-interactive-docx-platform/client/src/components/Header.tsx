'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { LogOut, Sun, Moon, Briefcase, FileText, ChevronDown, User, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const { user, logout, theme, setTheme } = useApp();

  const getRoleBadgeClass = () => {
    if (!user) return 'bg-slate-100 text-slate-700';
    switch (user.role) {
      case 'Admin': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'Editor': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Viewer': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
      <div className="mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left Side: Logo & Workspace Title */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <img src="/jk_logo.png" alt="Smart Controls" className="h-11 w-auto object-contain rounded-xl shadow-sm hover:scale-105 transition-transform duration-200" />
          <div className="hidden md:block border-l border-slate-200 dark:border-slate-700 pl-3">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold tracking-wider uppercase block leading-none">
              Interactive Handbook
            </span>
          </div>
        </Link>

        {/* Right Side: Theme togglers, Profile badge, and Log out */}
        <div className="flex items-center gap-4">
          
          {/* Theme Dropdown / Toggler */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl gap-1">
            <button
              onClick={() => setTheme('light')}
              title="Light Mode"
              className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Sun className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              title="Dark Mode"
              className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Moon className="h-4 w-4" />
            </button>

            <button
              onClick={() => setTheme('corporate')}
              title="Corporate Blue Theme"
              className={`p-1.5 rounded-lg transition-all ${theme === 'corporate' ? 'bg-slate-900 text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Briefcase className="h-4 w-4" />
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Profile Badge info */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md mt-0.5 ${getRoleBadgeClass()}`}>
                  {user.role}
                </span>
              </div>
              
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300">
                {user.role === 'Admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
            </div>
          )}

          {/* Log Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 rounded-xl"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

        </div>
      </div>
    </header>
  );
}
