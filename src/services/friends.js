import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchUserFriends = async (limit, page) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/friends?userId=${userId}&limit=${limit}&page=${page}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching all friends:", error);
    throw error;
  }
};

export const fetchUserFriendsByID = async (userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${userId}/friends`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch user friends. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching user friends:", error);
    throw error;
  }
};

export const fetchFriendsAndMutualFriendsCount = async (friendId) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${friendId}/friends-and-mutual-friends?userId=${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch friends and mutual friends count. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      friendCount: data.approvedFriendFriendsCount || 0,
      mutualFriendsCount: data.mutualFriendsCount || 0,
    };
  } catch (error) {
    console.error("Error fetching friends and mutual friends count:", error);
    throw error;
  }
};

// sendFriendRequest sends a friend request to the specified user.
// It can be confused with updateFriendRequest, which updates the status of a friend request.
export const sendFriendRequest = async (friendId) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/add-friend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friend_id: friendId }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error(
        `Failed to send friend request. \n\nMessage: ${
          data.Response.Message
        }. \nCode: ${
          response.status
        }. \nReq Url: ${API_URL}/api/v1/user/${userId}/add-friend. \nReq Body: ${JSON.stringify(
          { friend_id: friendId }
        )}`
      );
      throw new Error(
        `Failed to send friend request. \n\nMessage: ${data.Response.Message}. \nCode: ${response.status}.`
      );
    }
    return data;
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

export const updateFriendRequest = async (friendId, status) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${friendId}/update-status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friendId: userId,
          status: status,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error(
        `Failed to update friend request. \n\nMessage: ${data.Response.Message}`,
        `${API_URL}/api/v1/user/${friendId}/update-status`,
        JSON.stringify({
          friendId: userId,
          status: status,
        })`\nCode: ${response.status}`
      );
      throw new Error(
        `Failed to update friend request. \n\nMessage: ${data.Response.Message}.
        \nCode: ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error("Error updating friend request:", error);
    throw error;
  }
};

export const sendNotification = async (friendId, message) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/notifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentFromID: userId,
          sentToID: friendId,
          type: "friend_request",
          message: message,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Failed to send notification. \n\nMessage: ${data.Response.Message}. \nCode: ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};
