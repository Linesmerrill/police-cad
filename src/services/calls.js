import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

const buildQueryParams = (params) => {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
};

export const getCallById = async (callId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/call/${callId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to fetch call. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the fetched call data
  } catch (error) {
    console.error("Error fetching call by ID:", error);
    throw error;
  }
};

export const createCall = async (callData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(callData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create call. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the created call data
  } catch (error) {
    console.error("Error creating call:", error);
    throw error;
  }
};

export const fetchCallsByCommunityId = async (
  communityId,
  queryParams = {}
) => {
  try {
    const queryString = Object.keys(queryParams).length
      ? `?${buildQueryParams(queryParams)}`
      : "";
    const response = await makeApiCall(
      `${API_URL}/api/v1/calls/community/${communityId}${queryString}`,
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
        `Failed to fetch calls. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the fetched calls data
  } catch (error) {
    console.error("Error fetching calls:", error);
    throw error;
  }
};

export const updateCallById = async (callId, updatedData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/call/${callId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update call. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated call data
  } catch (error) {
    console.error("Error updating call:", error);
    throw error;
  }
};

export const deleteCallById = async (callId) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/call/${callId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to delete call. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    return { success: true }; // Return success response
  } catch (error) {
    console.error("Error deleting call:", error);
    throw error;
  }
};

export const addNoteToCall = async (callId, noteData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/call/${callId}/note`,
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
        `Failed to add note to call. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated call data with the new note
  } catch (error) {
    console.error("Error adding note to call:", error);
    throw error;
  }
};

export const updateNoteById = async (callId, noteId, updatedNoteData) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/call/${callId}/note/${noteId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedNoteData),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to update note. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data; // Return the updated call data with the updated note
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
};

export const deleteNoteById = async (callId, noteId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/call/${callId}/note/${noteId}`,
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

    return { success: true }; // Return success response
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
};
