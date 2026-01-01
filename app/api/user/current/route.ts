import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function GET(request: NextRequest) {
  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';

    // Forward the request to the backend API
    const response = await fetch(`${API_URL}/api/user/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json({ user: null }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

