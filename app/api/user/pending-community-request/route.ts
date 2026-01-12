import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, communityId } = body;

    if (!userId || !communityId) {
      return NextResponse.json({ error: 'User ID and Community ID are required' }, { status: 400 });
    }

    // Get cookies from the request to forward to the API
    const cookies = request.headers.get('cookie') || '';

    const url = `${API_URL}/api/v1/user/${userId}/pending-community-request`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ communityId }),
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying pending community request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
