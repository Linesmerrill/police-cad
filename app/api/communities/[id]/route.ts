import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';

    if (!id) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}/api/v1/community/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Community not found' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying community fetch request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

