import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role as string;

    // Admin / Organizer only routes
    if (path.startsWith('/admin')) {
      if (role !== 'SUPER_ADMIN' && role !== 'ORGANIZER') {
        return NextResponse.redirect(new URL('/login?error=UnauthorizedAdmin', req.url));
      }
    }

    // Referee operational routes
    if (path.startsWith('/referee')) {
      if (role !== 'SUPER_ADMIN' && role !== 'ORGANIZER' && role !== 'REFEREE') {
        return NextResponse.redirect(new URL('/login?error=UnauthorizedReferee', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public pages don't require token
        if (path === '/' || path.startsWith('/standings') || path.startsWith('/login') || path.startsWith('/tv') || path.startsWith('/api/')) {
          return true;
        }
        // Protected routes require being logged in
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/referee/:path*'],
};

