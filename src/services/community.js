import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchCommunityDetails = async (lastAccessedCommunityId) => {
  // const lastAccessedCommunityId = await SecureStore.getItemAsync(
  //   "lastAccessedCommunityId"
  // );
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${lastAccessedCommunityId}`,
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
        `Failed to fetch community details. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "[fetchCommunityDetails] Error fetching community details:",
      error
    );
    throw error;
  }
};

export const fetchCommunityDetailsById = async (communityId, authToken) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/community/${communityId}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + authToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      const data = await response.json();
      throw new Error(
        `[fetchCommunityDetailsById] Failed to fetch community details. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "[fetchCommunityDetailsById] Error fetching community details:",
      error
    );
    throw error;
  }
};

export const fetchCommunityMembers = async (lastAccessedCommunityId) => {
  // const lastAccessedCommunityId = await SecureStore.getItemAsync(
  //   "lastAccessedCommunityId"
  // );
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${lastAccessedCommunityId}/members`,
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
        `Failed to fetch community members. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching community members:", error);
    throw error;
  }
};

export const fetchCommunityMembersById = async (communityId, limit, page) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/members?limit=${limit}&page=${page}`,
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
        `[fetchCommunityMembersById] Failed to fetch community members. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "[fetchCommunityMembersById] Error fetching community members:",
      error,
      "communityId: ",
      communityId
    );
    throw error;
  }
};

export const fetchUserCommunities = async (
  userId,
  authToken,
  limit,
  page,
  filter
) => {
  console.log("authToken", authToken);

  console.log("userId", userId);
  try {
    const response = await fetch(
      `${API_URL}/api/v1/user/${userId}/communities?limit=${limit}&page=${page}&filter=${filter}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("authToken"),
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch user communities. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "[fetchUserCommunities] Error fetching user communities:",
      error
    );
    throw error;
  }
};

export const fetchEvents = async (communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/events`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

export const fetchEventDetails = async (communityId, eventId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/events/${eventId}`,
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
        `Failed to fetch event details. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching event details:", error);
    throw error;
  }
};

export const createEvent = async (eventData, communityId) => {
  // const lastAccessedCommunityId = await SecureStore.getItemAsync(
  //   "lastAccessedCommunityId"
  // );
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create event. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const createEventById = async (eventData, communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create event. \n\nMessage: ${data.response}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const deleteEvent = async (communityId, eventId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/events/${eventId}`,
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
        `Failed to delete event. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

export const updateEvent = async (communityId, eventId, updatedEvent) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/events/${eventId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEvent),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update event. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

export const createCommunity = async (community) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/community`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ community }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create community. \n\nMessage: ${data.Response?.Message}.\nError: ${data.Response?.Error} \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to create community", error);
    throw error;
  }
};

export const updateCommunityDetails = async (communityId, updatedDetails) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/community/${communityId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedDetails),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update community details. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update community details", error);
    throw error;
  }
};

export const fetchRoles = async (communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles`,
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
        `Failed to fetch roles. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch roles", error);
    throw error;
  }
};

export const createRole = async (communityId, roleName) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: roleName }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create role. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to create role", error);
    throw error;
  }
};

export const updateRoleMembers = async (communityId, roleId, members) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles/${roleId}/members`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(members),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update role members. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update role members", error);
    throw error;
  }
};

export const deleteRoleMember = async (communityId, roleId, memberId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles/${roleId}/members/${memberId}`,
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
        `Failed to delete role member. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to delete role member", error);
    throw error;
  }
};

export const updateRoleName = async (communityId, roleId, name) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles/${roleId}/name`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(name),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update role members. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update role members", error);
    throw error;
  }
};

export const deleteRole = async (communityId, roleId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles/${roleId}`,
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
        `Failed to delete role. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to delete role", error);
    throw error;
  }
};

export const updateRolePermissions = async (
  communityId,
  roleId,
  permissions
) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles/${roleId}/permissions`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permissions),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update role permissions. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update role permissions", error);
    throw error;
  }
};

export const sendJoinRequestNotification = async (communityId, user) => {
  try {
    // Fetch community details to get roles and permissions
    const community = await fetchCommunityDetailsById(communityId);
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
      await fetch(`${API_URL}/api/v1/users/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentFromID: user._id,
          sentToID: recipientId,
          type: "join_request",
          data1: communityId,
          data2: community.community.name,
          message: `has requested to join`,
        }),
      });
    }
  } catch (error) {
    console.error("Error sending join request notification:", error);
    throw error;
  }
};

export const updateJoinRequest = async (
  communityId,
  userId,
  status,
  migration = "false"
) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/user/${userId}/communities?migration=${migration}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId, status }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update list of communities for user ${userId}. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating join request:", error);
    throw error;
  }
};

export const deleteCommunity = async (communityId) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/community/${communityId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to delete community. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting community:", error);
    throw error;
  }
};

export const archiveCommunity = async (communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/archive`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to archive community. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error archiving community:", error);
    throw error;
  }
};

export const fetchBannedUsers = async (communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/banned-users`,
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
        `Failed to fetch banned users. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching banned users:", error);
    throw error;
  }
};

export const unbanUserFromCommunity = async (userId, communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/user/${userId}/unban-community`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to unban user from community. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error unbanning user from community:", error);
    throw error;
  }
};

// Saves the invite code to the community.
// Example invite message and url: Join Lines Police CAD! Here is the invite link: https://www.linespolice-cad.com/invite/LX097Y
export const saveInviteCode = async (communityId, inviteCode, userId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/add-invite-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: inviteCode,
          remainingUses: -1,
          createdBy: userId,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to save invite code. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error saving invite code:", error);
    throw error;
  }
};

export const fetchCommunityMembersByRoleId = async (communityId, roleId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/roles/${roleId}/members`,
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
        `[fetchCommunityMembersByRoleId] Failed to fetch community members by role. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "[fetchCommunityMembersByRoleId] Error fetching community members by role:",
      error
    );
    throw error;
  }
};

export const fetchOwnedCommunities = async (ownerId) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/communities/${ownerId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch owned communities. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the list of owned communities
  } catch (error) {
    console.error("Error fetching owned communities:", error);
    throw error;
  }
};

export const setMemberTenCode = async (communityId, userId, details) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/members/${userId}/tenCode`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(details),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to set Ten-Code for member. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated member data
  } catch (error) {
    console.error("Error setting Ten-Code for member:", error);
    throw error;
  }
};

export const deleteTenCode = async (communityId, codeId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/tenCodes/${codeId}`,
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
        `Failed to delete Ten-Code. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true; // Return success if the deletion was successful
  } catch (error) {
    console.error("Error deleting Ten-Code:", error);
    throw error;
  }
};

export const updateTenCode = async (communityId, codeId, updatedData) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/tenCodes/${codeId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update Ten-Code. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated Ten-Code data
  } catch (error) {
    console.error("Error updating Ten-Code:", error);
    throw error;
  }
};

export const createTenCode = async (communityId, tenCodeData) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/tenCodes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tenCodeData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create Ten-Code. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the created Ten-Code data
  } catch (error) {
    console.error("Error creating Ten-Code:", error);
    throw error;
  }
};

export const updateFineSettings = async (communityId, fineSettings) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${communityId}/fines`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fineSettings),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update fine settings. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated fine settings
  } catch (error) {
    console.error("Error updating fine settings:", error);
    throw error;
  }
};

export const fetchEliteCommunities = async (limit = 5) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/communities/elite?limit=${limit}`,
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
        `Failed to fetch elite communities. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch elite communities.`, error);
    throw error;
  }
};

export const subscribeCommunity = async (
  userId,
  communityId,
  subscriptionId,
  status,
  tier,
  isAnnual,
  promotionalText,
  promotionalDescription,
  purchaseDate,
  expirationDate,
  durationMonths
) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/community/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        communityId,
        subscriptionId,
        status,
        tier,
        isAnnual,
        promotionalText,
        promotionalDescription,
        purchaseDate,
        expirationDate,
        durationMonths,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to subscribe community. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the subscription response
  } catch (error) {
    console.error("Error subscribing community:", error);
    throw error;
  }
};

export const cancelCommunitySubscription = async (communityId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/cancel-subscription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          communityId,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to cancel subscription. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the unsubscribe response
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
};

export const fetchUserCommunitySubscriptions = async (
  userId,
  limit = 10,
  page = 0
) => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/community/${userId}/subscriptions`,
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
        `Failed to fetch user subscriptions. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    throw error;
  }
};

export const fetchCommunitiesByTag = async (tag, limit = 10, page = 0) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/communities/tag/${tag}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch communities by tag. \n\nMessage: ${JSON(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching communities by tag:", error);
    throw error;
  }
};
