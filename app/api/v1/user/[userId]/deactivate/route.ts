import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const cookieHeader = request.headers.get('cookie') || '';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}/api/v1/user/${userId}/deactivate`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch {
        return NextResponse.json({ error: errorText }, { status: response.status });
      }
    }

    const data = await response.json();
    
    // Clear the session cookie to log the user out after deactivation
    const responseToReturn = NextResponse.json(data);
    
    // Clear the connect.sid session cookie by setting it to expire immediately
    responseToReturn.cookies.set('connect.sid', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    
    // Clear any other potential auth cookies
    responseToReturn.cookies.set('auth_token', '', {
      expires: new Date(0),
      path: '/',
    });
    
    // Add a header to indicate logout is required
    responseToReturn.headers.set('X-Requires-Logout', 'true');
    
    return responseToReturn;
  } catch (error) {
    console.error('Error proxying user deactivate request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
