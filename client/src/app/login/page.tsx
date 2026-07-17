'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Lock, Mail, FileText, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const { login, theme } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-900">
      {/* Dynamic graphic background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-950/20 via-slate-900 to-slate-950 z-0" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />

      <div className="max-w-md w-full space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="mx-auto flex justify-center">
            <img src="/jk_logo.png" alt="Smart Controls Logo" className="h-28 w-auto object-contain rounded-2xl shadow-xl hover:scale-105 transition-transform duration-200" />
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">
            Interactive Documentation Hub
          </p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl border border-slate-700/50 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-700 bg-slate-900/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-700 bg-slate-900/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-slate-950 bg-[#f97316] hover:bg-[#ea580c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f97316] transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ChevronRight className="h-4 w-4 ml-1 text-slate-950 font-bold" />
            </button>
          </form>


        </div>

        <div className="text-center text-xs text-slate-500">
          Secure, audit-ready version history enabled. All actions are logged.
        </div>
      </div>
    </div>
  );
}
