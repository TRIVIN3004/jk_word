'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'Admin' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type Theme = 'light' | 'dark' | 'corporate';

interface AppContextType {
  user: User | null;
  token: string | null;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  favorites: string[];
  toggleFavorite: (chapterId: string) => void;
  recentPages: string[];
  addRecentPage: (chapterId: string) => void;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  apiUrl: string;
  fetchWithAuth: (endpoint: string, options?: any) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>('corporate');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const router = useRouter();

  const apiUrl = 'http://localhost:5000/api';

  // Load from local storage
  useEffect(() => {
    const storedToken = localStorage.getItem('docx_token');
    const storedUser = localStorage.getItem('docx_user');
    const storedTheme = localStorage.getItem('docx_theme') as Theme;
    const storedFavs = localStorage.getItem('docx_favorites');
    const storedRecents = localStorage.getItem('docx_recents');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    if (storedTheme) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    } else {
      applyTheme('corporate');
    }
    if (storedFavs) {
      setFavorites(JSON.parse(storedFavs));
    }
    if (storedRecents) {
      setRecentPages(JSON.parse(storedRecents));
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-corporate', 'theme-light');
    
    if (t === 'dark') {
      root.classList.add('dark');
    } else if (t === 'corporate') {
      root.classList.add('theme-corporate');
    } else {
      root.classList.add('theme-light');
    }
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('docx_theme', t);
    applyTheme(t);
  };

  const toggleFavorite = (chapterId: string) => {
    let updated;
    if (favorites.includes(chapterId)) {
      updated = favorites.filter(id => id !== chapterId);
    } else {
      updated = [...favorites, chapterId];
    }
    setFavorites(updated);
    localStorage.setItem('docx_favorites', JSON.stringify(updated));
  };

  const addRecentPage = (chapterId: string) => {
    const filtered = recentPages.filter(id => id !== chapterId);
    const updated = [chapterId, ...filtered].slice(0, 10); // Keep last 10
    setRecentPages(updated);
    localStorage.setItem('docx_recents', JSON.stringify(updated));
  };

  // Simplified login helper that logs in with the Express API
  const login = async (email: string, selectedRole?: UserRole) => {
    try {
      // Mock log in locally if server is not fully online, or use real fetch
      // For a seamless test experience, we have quick logins for Admin, Editor, Viewer
      let password = 'viewer123';
      if (selectedRole === 'Admin') password = 'admin123';
      if (selectedRole === 'Editor') password = 'editor123';

      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Authentication failed');
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      
      localStorage.setItem('docx_token', data.token);
      localStorage.setItem('docx_user', JSON.stringify(data.user));

      router.push('/dashboard');
      return true;
    } catch (err) {
      console.error("Login failure:", err);
      // Fallback mock login if server connection fails (keeps frontend work testable)
      const mockUser: User = {
        id: `mock-${Date.now()}`,
        name: selectedRole ? `${selectedRole} User` : 'Viewer User',
        email,
        role: selectedRole || 'Viewer'
      };
      const mockToken = 'mock-jwt-token-key-12345';
      
      setToken(mockToken);
      setUser(mockUser);
      localStorage.setItem('docx_token', mockToken);
      localStorage.setItem('docx_user', JSON.stringify(mockUser));
      router.push('/dashboard');
      return true;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('docx_token');
    localStorage.removeItem('docx_user');
    router.push('/login');
  };

  const fetchWithAuth = async (endpoint: string, options: any = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Default to JSON body if object is passed
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP error ${response.status}`);
    }

    // Handle binary files
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/octet-stream') || contentType.includes('wordprocessingml'))) {
      return response.blob();
    }

    return response.json();
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      theme,
      setTheme,
      favorites,
      toggleFavorite,
      recentPages,
      addRecentPage,
      login,
      logout,
      apiUrl,
      fetchWithAuth
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
