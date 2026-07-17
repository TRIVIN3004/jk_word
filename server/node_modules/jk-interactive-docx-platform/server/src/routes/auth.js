import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'docx-platform-super-secret-key-12345';

// ──────────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) throw error;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────────
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ──────────────────────────────────────────────────
// GET /api/auth/users  (Admin only — list all users)
// ──────────────────────────────────────────────────
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('name');

    if (error) throw error;
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// POST /api/auth/users  (Admin only — create user)
// ──────────────────────────────────────────────────
router.post('/users', verifyToken, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are required.' });
  }

  if (!['Editor', 'Viewer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be Editor or Viewer.' });
  }

  try {
    const { data: existing, error: findErr } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (findErr) throw findErr;

    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const newUser = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: bcrypt.hashSync(password, 10),
      role
    };

    const { error: insertErr } = await supabase.from('users').insert(newUser);
    if (insertErr) throw insertErr;

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser, message: 'User created successfully.' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────
// DELETE /api/auth/users/:id  (Admin only — delete user)
// ──────────────────────────────────────────────────
router.delete('/users/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

export default router;
