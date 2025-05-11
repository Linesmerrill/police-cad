import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchCiviliansByUserId = async (communityId, userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilians/user/${userId}?active_community_id=${communityId}`,
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
        `Failed to fetch civilians. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching civilians:", error);
    throw error;
  }
};

export const createCivilian = async (civilianData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/civilian`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(civilianData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create civilian. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating civilian:", error);
    throw error;
  }
};

export const updateCivilian = async (civilianId, civilian) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilian/${civilianId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(civilian),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update civilian. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating civilian:", error);
    throw error;
  }
};

export const fetchCivilianById = async (civilianId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilian/${civilianId}`,
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
        `Failed to fetch civilian. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching civilian:", error);
    throw error;
  }
};

export const deleteCivilian = async (civilianId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilian/${civilianId}`,
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
        `Failed to delete civilian. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting civilian:", error);
    throw error;
  }
};

export const searchCiviliansByName = async (name, communityId, limit, page) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilians/search?name=${encodeURIComponent(
        name
      )}&active_community_id=${communityId}&limit=${limit}&page=${page}`,
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
        `Failed to search civilians. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching civilians:", error);
    throw error;
  }
};

export const createCriminalHistory = async (civilianId, historyData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilian/${civilianId}/criminal-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(historyData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create criminal history. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the created criminal history object
  } catch (error) {
    console.error("Error creating criminal history:", error);
    throw error;
  }
};

export const updateCriminalHistory = async (
  civilianId,
  citationId,
  historyData
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/civilian/${civilianId}/criminal-history/${citationId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(historyData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update criminal history. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated criminal history object
  } catch (error) {
    console.error("Error updating criminal history:", error);
    throw error;
  }
};
