import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_POLICE_CAD_API_URL || 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationId, action, notificationType, sentFromID, data1, data2, data3, data4 } = body;

    if (!userId || !notificationId || !action || !notificationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get cookies from the request to forward to the API
    const cookies = request.headers.get('cookie') || '';

    const requests = [];

    // Handle friend request
    if (notificationType === 'friend_request') {
      requests.push(
        fetch(`${API_URL}/api/v1/user/${userId}/add-friend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies,
          },
          body: JSON.stringify({ friend_id: sentFromID }),
        })
      );
    }
    // Handle join request (community)
    else if (notificationType === 'join_request' && !data3) {
      requests.push(
        fetch(`${API_URL}/api/v1/user/${sentFromID}/communities?migration=false`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies,
          },
          body: JSON.stringify({
            communityId: data1,
            status: action,
          }),
        })
      );
    }
    // Handle join request (department)
    else if (notificationType === 'join_request' && data3) {
      requests.push(
        fetch(`${API_URL}/api/v1/community/${data1}/departments/${data3}/join-requests`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies,
          },
          body: JSON.stringify({
            userId: sentFromID,
            status: action,
          }),
        })
      );
    }

    // Send notification to the requester
    if (requests.length > 0) {
      const message =
        action === 'approved'
          ? `✅ Your request to join ${data2}${data4 ? "'s department " + data4 : ''} has been ${action}.`
          : `❌ Your request to join ${data2}${data4 ? "'s department " + data4 : ''} has been ${action}.`;
      
      requests.push(
        fetch(`${API_URL}/api/v1/users/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies,
          },
          body: JSON.stringify({
            sentFromID: userId,
            sentToID: sentFromID,
            type: 'notification',
            message,
          }),
        })
      );
    }

    // Delete the notification
    requests.push(
      fetch(`${API_URL}/api/v1/user/${userId}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
        },
      })
    );

    const responses = await Promise.all(requests);
    const errors = responses.filter(r => !r.ok);
    
    if (errors.length > 0) {
      const errorText = await errors[0].text();
      return NextResponse.json({ error: errorText }, { status: errors[0].status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error proxying notification action request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

