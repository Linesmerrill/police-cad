import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '12';

    if (!q.trim()) {
      return NextResponse.json({ data: [], totalCount: 0, total: 0 }, { status: 200 });
    }

    // Get cookies from the request to forward to the API
    const cookies = request.headers.get('cookie') || '';

    // Escape brackets for regex if backend uses regex search
    const escapedQuery = q.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    const encodedQuery = encodeURIComponent(escapedQuery);

    const url = `${API_URL}/api/v1/search/communities?q=${encodedQuery}&limit=${limit}&page=${page}`;
    
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
    console.error('Error proxying community search request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

