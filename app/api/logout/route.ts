import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Clear cookies and redirect to home
  // The Express route will handle session destruction
  const response = NextResponse.redirect(new URL('/', request.url));
  
  // Clear session cookie
  response.cookies.set('connect.sid', '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  
  return response;
}
