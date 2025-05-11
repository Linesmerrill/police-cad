import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const searchBackend = async (query, limit = 6, page = 1) => {
  const userId = await SecureStore.getItemAsync("userId");
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/search?q=${encodeURIComponent(
        query
      )}&limit=${limit}&page=${page}&userId=${userId}`,
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
        `Failed to search. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error("Error searching:", error);
    throw error;
  }
};

export const searchCommunities = async (query, limit = 6, page = 1) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/search/communities?q=${encodeURIComponent(
        query
      )}&limit=${limit}&page=${page}`,
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
        `Failed to search communities. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }
    return data;
  } catch (error) {
    console.error("Error searching communities:", error);
    throw error;
  }
};
