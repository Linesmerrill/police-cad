import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get cookies from the request to forward to the API
    const cookies = request.headers.get('cookie') || '';

    const url = `${API_URL}/api/v2/users/${userId}/notifications?limit=${limit}&page=${page}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying notifications request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

