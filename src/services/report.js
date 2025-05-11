import * as SecureStore from "expo-secure-store";
import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const submitReport = async (
  itemId,
  itemType,
  reportType,
  reportedIssue,
  additionalDetails,
  reportedById
) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId,
        itemType,
        reportType,
        reportedIssue,
        additionalDetails,
        reportedById,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Failed to create report. \n\nMessage: ${data.Response.Message}. \nCode: ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("[report.js] Error creating report:", error);
    throw error;
  }
};
