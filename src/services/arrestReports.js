import { makeApiCall } from "./api";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const createArrestReport = async (arrestReportData) => {
  try {
    const response = await makeApiCall(`${API_URL}/api/v1/arrest-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ arrestReport: arrestReportData }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create Arrest Report. \n\nMessage: ${JSON.stringify(
          data
        )}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating Arrest Report:", error);
    throw error;
  }
};

export const fetchArrestReportsByCivilianId = async (civilianId) => {
  try {
    const response = await makeApiCall(
      `${API_URL}/api/v1/arrest-report/arrestee/${civilianId}`,
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
        `Failed to fetch Arrest Reports. \n\nMessage: ${data.message}. \nCode: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Arrest Reports:", error);
    throw error;
  }
};
