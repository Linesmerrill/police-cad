const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export async function fetchLastAccessedCommunity(userId, authToken) {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/users/last-accessed-community?userId=${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.status === 404) {
      return {};
    }
    const data = await response.json();
    if (data?._id === undefined) {
      return {};
    }
    // await SecureStore.setItemAsync("lastAccessedCommunityId", data._id);
    return data;
  } catch (error) {
    console.error(
      "[fetchLastAccessedCommunity] Error fetching community details:",
      `${API_URL}/api/v1/users/last-accessed-community?userId=${userId}`,
      error
    );
    throw error;
  }
}
