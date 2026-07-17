import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import supabase from '@/lib/supabase';
import { withAuth, requireAdmin, errorResponse } from '@/lib/auth';

// GET /api/auth/users — list all users (Admin only)
export const GET = withAuth(async (_req, user) => {
  requireAdmin(user);
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .order('name');
  if (error) throw error;
  return NextResponse.json({ users });
});

// POST /api/auth/users — create a new user (Admin only)
export const POST = withAuth(async (req, user) => {
  requireAdmin(user);
  const { name, email, password, role } = await req.json();

  if (!name || !email || !password || !role) {
    return errorResponse('Name, email, password and role are required.');
  }
  if (!['Editor', 'Viewer'].includes(role)) {
    return errorResponse('Role must be Editor or Viewer.');
  }

  const { data: existing, error: findErr } = await supabase
    .from('users').select('id').ilike('email', email.trim()).maybeSingle();
  if (findErr) throw findErr;
  if (existing) return errorResponse('Email already registered.', 400);

  const newUser = {
    id: `u-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    role,
  };

  const { error: insertErr } = await supabase.from('users').insert(newUser);
  if (insertErr) throw insertErr;

  const { password: _, ...safeUser } = newUser;
  return NextResponse.json({ user: safeUser, message: 'User created successfully.' }, { status: 201 });
});
