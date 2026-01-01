import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get cookies from the request to forward to the API
    const cookies = request.headers.get('cookie') || '';

    const url = `${API_URL}/api/v1/communities/${userId}`;
    
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
    // Transform the data to match the expected format
    const communities = Array.isArray(data) ? data : [];
    const transformedData = communities
      .filter((item: any) => {
        const community = item.community || item;
        return community && community.visibility; // Only new format communities
      })
      .map((item: any) => {
        const community = item.community || item;
        return {
          _id: community._id || item._id,
          name: community.name || 'Unnamed Community',
          membersCount: community.membersCount || 0,
          imageLink: community.imageLink && !community.imageLink.includes("file:///") && community.imageLink.trim() !== ''
            ? community.imageLink
            : "/static/images/default-logo.png",
          tags: community.tags || [],
          promotionalText: community.promotionalText || '',
          promotionalDescription: community.promotionalDescription || '',
          subscription: community.subscription ? { active: true } : { active: false },
        };
      });

    return NextResponse.json({
      data: transformedData,
      totalCount: transformedData.length,
      page: 1,
      limit: transformedData.length,
    });
  } catch (error) {
    console.error('Error proxying owned communities request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

