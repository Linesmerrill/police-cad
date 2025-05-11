import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export async function fetchSpotlightData(email) {
  const response = await makeApiCall(
    `${API_URL}/api/v1/spotlight?limit=10&page=0`,
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
      "Failed to fetch data for /api/v1/spotlight"
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
