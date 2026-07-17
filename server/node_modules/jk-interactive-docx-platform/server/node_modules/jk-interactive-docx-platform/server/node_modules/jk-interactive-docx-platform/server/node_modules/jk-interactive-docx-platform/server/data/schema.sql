-- PostgreSQL schema definitions for Supabase

-- Clean up existing tables (optional, for resets)
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL, -- bcrypt hashed password
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Editor', 'Viewer'))
);

-- 2. Chapters Table
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 1,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Versions Table (History of document changes)
CREATE TABLE versions (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL
);

-- 4. Comments Table
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Notes Table
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Bookmarks Table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- references user email or ID
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
