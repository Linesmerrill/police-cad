import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchNotifications = async () => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${userId}/notifications`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Failed to fetch notifications. \n\nMessage: ${data.Response.Message}. \nCode: ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error("[notification.js] Error fetching notifications:", error);
    throw error;
  }
};

export const sendNotification = async (sentFromID, sentToID, type, message) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/notifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentFromID,
          sentToID,
          type,
          message,
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

export const markNotificationAsRead = async (notificationId) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/notifications/${notificationId}/read`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seen: true }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to mark notification as read. \n\nMessage: ${data.Response.Message}. \nCode: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const deleteNotification = async (notificationId) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/notifications/${notificationId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to delete notification. \n\nMessage: ${data.Response.Message}. \nCode: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};
