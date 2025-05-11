// import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const fetchUserById = async (userId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch user. \n\nMessage: ${JSON.stringify(
          data
        )}, \nUserId: ${userId}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[fetchUserById] Error fetching user:", error);
    throw error;
  }
};

export const updateLastAccessedCommunity = async (
  userId,
  communityId,
  createdAt
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/last-accessed-community`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          communityId,
          createdAt,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `\n[updateLastAccessedCommunity] Failed to update last accessed community. \n\nError: ${data["Response"]["Error"]}.\nMessage: ${data["Response"]["Message"]} \nCode: ${response.status} \nUserId: ${userId} \nCommunityId: ${communityId} \nCreatedAt: ${createdAt}\n`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchRandomCommunities = async (
  userId,
  authToken,
  limit = 5,
  page = 1,
  filter
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/random-communities?limit=${limit}&page=${page}&filter=${filter}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch random communities for UserId: ${userId}. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Failed to fetch random communities for UserId: ${userId}}`,
      error
    );
    throw error;
  }
};

export const fetchPrioritizedCommunities = async (userId, limit = 5) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/prioritized-communities?limit=${limit}`,
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
        `Failed to fetch prioritized communities for UserId: ${userId}. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Failed to fetch prioritized communities for UserId: ${userId}}`,
      error
    );
    throw error;
  }
};

export const sendUserPendingCommunityRequest = async (communityId, userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/pending-community-request`,
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
        `Failed to send pending community request. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending pending community request:", error);
    throw error;
  }
};

export const sendUserPendingDepartmentRequest = async (
  communityId,
  departmentId,
  userId
) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/pending-department-request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId, departmentId }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to send pending department request. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending pending department request:", error);
    throw error;
  }
};

export const removeUserFromCommunity = async (userId, communityId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/remove-community`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ communityId }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to remove user from community. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error removing user from community:", error);
    throw error;
  }
};

export const banUserFromCommunity = async (userId, communityId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/ban-community`,
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
        `Failed to ban user from community. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error banning user from community:", error);
    throw error;
  }
};

export const updateUserById = async (userId, userData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update user. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const blockUser = async (userId, friendId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/block`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, friendId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to block user. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error blocking user:", error);
    throw error;
  }
};

export const unblockUser = async (userId, friendId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/unblock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, friendId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to unblock user. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error unblocking user:", error);
    throw error;
  }
};

export const updateOnlineStatus = async (userId, isOnline) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/online-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, isOnline }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update online status. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating online status:", error);
    throw error;
  }
};

export const unfriendUser = async (userId, friendId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/unfriend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, friendId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to unfriend user. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error unfriending user:", error);
    throw error;
  }
};

export const fetchUsersByIds = async (userIds) => {
  console.log("Fetching users by IDs:", userIds);
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch users. \n\nMessage: ${JSON.stringify(data)}. \nCode: ${
          response.status
        }`
      );
    }

    const data = await response.json();
    return data.users; // Return the list of user objects
  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    throw error;
  }
};

export const subscribeUser = async (
  userId,
  subscriptionId,
  status,
  tier,
  isAnnual
) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/user/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        subscriptionId,
        status,
        tier,
        isAnnual,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to subscribe user. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the subscription response
  } catch (error) {
    console.error("Error subscribing user:", error);
    throw error;
  }
};

export const checkoutSession = async (userId, tier, isAnnual) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/create-checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          tier,
          isAnnual,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create a checkout session. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the subscription response
  } catch (error) {
    console.error("Error creating a checkout session:", error);
    throw error;
  }
};

export const verifySubscription = async (sessionId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/verify-subscription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to verify subscription. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the subscription verification response
  } catch (error) {
    console.error("Error verifying subscription:", error);
    throw error;
  }
};

export const cancelSubscription = async (userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/cancel-subscription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
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

export const createNote = async (userId, noteData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${userId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create note. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data.note; // Return the created note data
  } catch (error) {
    console.error("Error creating note:", error);
    throw error;
  }
};

export const updateNote = async (userId, noteId, noteData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${userId}/notes/${noteId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update note. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated note data
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
};

export const deleteNote = async (userId, noteId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${userId}/notes/${noteId}`,
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
        `Failed to delete note. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true; // Return success if the deletion was successful
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
};

// Deprecated: For Migrating from v3 to v4
export const fetchUsersByActiveCommunityId = async (communityId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/users/${communityId}`,
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
        `Failed to fetch users by active community ID. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching users by active community ID:", error);
    throw error;
  }
};

export const updateUserSubscription = async (userId, subscriptionData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/subscription`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update user subscription. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated subscription data
  } catch (error) {
    console.error("Error updating user subscription:", error);
    throw error;
  }
};

export const deactivateUserAccount = async (userId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/user/${userId}/deactivate`,
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
        `Failed to deactivate user account. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return true; // Return success if the deactivation was successful
  } catch (error) {
    console.error("Error deactivating user account:", error);
    throw error;
  }
};
