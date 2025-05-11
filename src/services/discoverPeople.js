import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export async function fetchDiscoverPeopleData(limit = 10, page = 1) {
  const userId = await SecureStore.getItemAsync("userId");
  const response = await makeApiCall(
    `${API_URL}/api/v1/users/discover-people?userId=${userId}&limit=${limit}&page=${page}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    console.error(
      response.status,
      `Failed to fetch data for /api/v1/users/discover-people?userId=${userId}`
    );
    return [];
  }

  const data = await response.json();
  if (data === null || data === undefined) {
    console.error("No data found");
    return [];
  } else {
    return data;
  }
}
