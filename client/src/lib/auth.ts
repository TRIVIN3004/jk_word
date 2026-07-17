import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'docx-platform-super-secret-key-12345';

export interface JwtUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

/**
 * Verifies the Bearer token from the Authorization header.
 * Returns the decoded user payload or throws a 401/403 NextResponse.
 */
export function getUser(req: NextRequest): JwtUser {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  try {
    return jwt.verify(token, JWT_SECRET) as JwtUser;
  } catch {
    throw new Error('FORBIDDEN');
  }
}

/** Helper to return a standardised error response */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Guard: require Admin role */
export function requireAdmin(user: JwtUser) {
  if (user.role !== 'Admin') throw new Error('ADMIN_REQUIRED');
}

/** Guard: require Editor or Admin role */
export function requireEditor(user: JwtUser) {
  if (user.role !== 'Editor' && user.role !== 'Admin') throw new Error('EDITOR_REQUIRED');
}

/** Wrap a route handler with auth error handling */
export function withAuth(
  handler: (req: NextRequest, user: JwtUser, context?: any) => Promise<Response>
) {
  return async (req: NextRequest, context?: any): Promise<Response> => {
    try {
      const user = getUser(req);
      return await handler(req, user, context);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') return errorResponse('Access denied. No token provided.', 401);
      if (err.message === 'FORBIDDEN') return errorResponse('Invalid or expired token.', 403);
      if (err.message === 'ADMIN_REQUIRED') return errorResponse('Forbidden. Admin role required.', 403);
      if (err.message === 'EDITOR_REQUIRED') return errorResponse('Forbidden. Editor or Admin role required.', 403);
      console.error('API route error:', err);
      return errorResponse('Internal server error: ' + err.message, 500);
    }
  };
}
