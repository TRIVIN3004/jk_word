import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'docx-platform-super-secret-key-12345';

// Verify token middleware
export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// Admin only middleware
export function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden. Admin role required.' });
  }
  next();
}

// Editor or Admin middleware
export function isEditor(req, res, next) {
  if (!req.user || (req.user.role !== 'Editor' && req.user.role !== 'Admin')) {
    return res.status(403).json({ error: 'Forbidden. Editor or Admin role required.' });
  }
  next();
}
