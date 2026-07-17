import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'docx-platform-super-secret-key-12345';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Please provide email and password.' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) throw error;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
