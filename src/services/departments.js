import { makeApiCall } from "./api";
import { fetchCommunityDetailsById } from "./community";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchUserDepartments = async (communityId, userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/user/${userId}/departments`,
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
        `Failed to fetch user departments. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user departments:", error);
    throw error;
  }
};

export const fetchAllDepartments = async (communityId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments`,
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
        `Failed to fetch all departments. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching all departments:", error);
    throw error;
  }
};

export const createDepartment = async (communityId, departmentData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(departmentData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create department. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error creating department:",
      `${API_URL}/api/v1/community/${communityId}/departments`,
      JSON.stringify(departmentData),
      error
    );
    throw error;
  }
};

export const updateDepartmentMembers = async (
  communityId,
  departmentId,
  members
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ members }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update department members. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error updating department members:",
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/members`,
      JSON.stringify({ members }),
      error
    );
    throw error;
  }
};

export const deleteDepartment = async (communityId, departmentId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`,
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
        `Failed to delete department. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error deleting department:",
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`,
      error
    );
    throw error;
  }
};

export const fetchDepartmentById = async (communityId, departmentId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`,
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
        `Failed to fetch department. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error fetching department:",
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`,
      error
    );
    throw error;
  }
};

export const removeUserFromDepartment = async (
  userId,
  communityId,
  departmentId
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/remove-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to remove user from department. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error removing user from department:",
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/remove-user`,
      error
    );
    throw error;
  }
};

export const updateDepartmentImageLink = async (
  communityId,
  departmentId,
  imageUrl
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/update-image`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update department image link. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error updating department image link:",
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/update-image`,
      error
    );
    throw error;
  }
};

export const updateDepartmentDetails = async (
  communityId,
  departmentId,
  updatedDetails
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedDetails),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update department details. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error updating department details:",
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}`,
      error
    );
    throw error;
  }
};

export const sendJoinDepartmentRequestNotification = async (
  communityId,
  departmentId,
  user
) => {
  try {
    // Fetch community details to get roles and permissions
    const community = await fetchCommunityDetailsById(communityId);
    const department = await fetchDepartmentById(communityId, departmentId);
    // Get user IDs of roles with "manage members" or "administrator" permissions
    const userIds = community.community.roles
      .filter((role) =>
        role.permissions.some(
          (permission) =>
            (permission.name === "manage members" ||
              permission.name === "administrator") &&
            permission.enabled
        )
      )
      .flatMap((role) => role.members);

    // Send notification to each user
    for (const recipientId of userIds) {
      await makeApiCall(`${API_URL}/api/v1/users/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentFromID: user._id,
          sentToID: recipientId,
          type: "join_request",
          data1: communityId,
          data2: community?.community?.name,
          data3: departmentId,
          data4: department?.department?.name,
          message: `has requested to join`,
        }),
      });
    }
  } catch (error) {
    console.error("Error sending join request notification:", error);
    throw error;
  }
};

export const updateDepartmentJoinRequest = async (
  communityId,
  departmentId,
  userId,
  status
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/community/${communityId}/departments/${departmentId}/join-requests`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, status }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update department join request for user ${userId}. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating department join request:", error);
    throw error;
  }
};
