import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchBolos = async (
  communityId,
  departmentId,
  page,
  filters = {}
) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      communityId,
      departmentId,
      page,
      ...filters, // Add any additional filters (e.g., status=true)
    }).toString();

    const response = await makeApiCall(
      `${API_URL}/api/v1/bolos?${queryParams}`,
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
        `Failed to fetch BOLOs. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the full response, including totalCount and data
  } catch (error) {
    console.error(
      "Error fetching BOLOs:",
      `${API_URL}/api/v1/bolos?communityId=${communityId}&departmentId=${departmentId}&page=${page}`,
      error
    );
    throw error;
  }
};

export const createBolo = async (boloData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/bolo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bolo: boloData }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create BOLO. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating BOLO:", error);
    throw error;
  }
};

export const updateBolo = async (boloId, updateData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/bolo/${boloId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData), // Send the update data in the request body
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update BOLO. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated BOLO data
  } catch (error) {
    console.error("Error updating BOLO:", error);
    throw error;
  }
};

export const deleteBolo = async (boloId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/bolo/${boloId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to delete BOLO. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true; // Return true if the deletion was successful
  } catch (error) {
    console.error("Error deleting BOLO:", error);
    throw error;
  }
};
