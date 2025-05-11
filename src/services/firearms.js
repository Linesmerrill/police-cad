import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchFirearmsByUserId = async (communityId, userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/firearms/user/${userId}?active_community_id=${communityId}`,
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
        `Failed to fetch firearms. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching firearms:", error);
    throw error;
  }
};

export const createFirearm = async (firearmData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/firearm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(firearmData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create firearm. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating firearm:", error);
    throw error;
  }
};

export const fetchFirearmById = async (firearmId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/firearm/${firearmId}`,
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
        `Failed to fetch firearm. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching firearm:", error);
    throw error;
  }
};

export const updateFirearm = async (firearmId, firearmData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/firearm/${firearmId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(firearmData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update firearm. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating firearm:", error);
    throw error;
  }
};

export const deleteFirearm = async (firearmId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/firearm/${firearmId}`,
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
        `Failed to delete firearm. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting firearm:", error);
    throw error;
  }
};

export const fetchFirearmsByRegisteredOwnerId = async (
  registeredOwnerId,
  limit,
  page
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/firearms/registered-owner/${registeredOwnerId}?limit=${
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
        `Failed to fetch firearms by registered owner ID. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching firearms by registered owner ID:", error);
    throw error;
  }
};

export const searchFirearms = async ({
  name,
  serialNumber,
  communityId,
  limit,
  page,
}) => {
  try {
    const queryParams = new URLSearchParams({
      ...(name && { name }),
      ...(serialNumber && { serialNumber }),
      ...(communityId && { communityId }),
      limit: limit || 10,
      page: page || 0,
    });

    const response = await makeApiCall(
      `${API_URL}/api/v1/firearms/search?${queryParams.toString()}`,
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
        `Failed to search firearms. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching firearms:", error);
    throw error;
  }
};
