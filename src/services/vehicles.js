import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchVehiclesByUserId = async (communityId, userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/vehicles/user/${userId}?active_community_id=${communityId}`,
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
        `Failed to fetch vehicles. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
};

export const createVehicle = async (vehicleData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/vehicle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicleData),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create vehicle. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating vehicle:", error);
    throw error;
  }
};

// Fetch a vehicle by its ID
export const fetchVehicleById = async (vehicleId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/vehicle/${vehicleId}`,
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
        `Failed to fetch vehicle. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    throw error;
  }
};

// Update a vehicle by its ID
export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/vehicle/${vehicleId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vehicleData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update vehicle. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

// Delete a vehicle by its ID
export const deleteVehicle = async (vehicleId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/vehicle/${vehicleId}`,
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
        `Failed to delete vehicle. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    throw error;
  }
};

export const fetchVehiclesByRegisteredOwnerId = async (
  registeredOwnerId,
  limit,
  page
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/vehicles/registered-owner/${registeredOwnerId}?limit=${
        limit || 10
      }&page=${page || 0}`,
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
        `Failed to fetch vehicles by registered owner ID. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching vehicles by registered owner ID:", error);
    throw error;
  }
};

export const searchVehicles = async ({
  plate,
  vin,
  make,
  model,
  communityId,
  limit,
  page,
}) => {
  try {
    const queryParams = new URLSearchParams({
      ...(plate && { plate }),
      ...(vin && { vin }),
      ...(make && { make }),
      ...(model && { model }),
      ...(communityId && { active_community_id: communityId }),
      limit: limit || 10,
      page: page || 0,
    });

    const response = await makeApiCall(
      `${API_URL}/api/v1/vehicles/search?${queryParams.toString()}`,
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
        `Failed to search vehicles. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching vehicles:", error);
    throw error;
  }
};
