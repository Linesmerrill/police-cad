import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { notificationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Get cookies from the request to forward to the API
    const cookies = request.headers.get('cookie') || '';

    const url = `${API_URL}/api/v2/users/${userId}/notifications/${notificationId}/read`;
    
    const response = await fetch(url, {
      method: 'POST',
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
    console.error('Error proxying mark notification as read request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

