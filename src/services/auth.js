import base64 from "react-native-base64";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const loginUser = async (username, password) => {
  const payload = {
    username,
    password,
  };

  var encoded = base64.encode(`${username}:${password}`);

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      //   await SecureStore.setItemAsync("token", data.token);
      //   await SecureStore.setItemAsync("userId", data._id);
      //   storeCredentials(username, password);
      //   updateOnlineStatus(data._id, true);
      return { success: true, message: "" };
    } else {
      // Extract the specific error message if available, stopping at the first comma
      const errorMessageMatch = data.message.match(/\[(.*?),/);
      let errorMessage = errorMessageMatch
        ? errorMessageMatch[1]
        : data.message || "Login failed";

      // If the error message contains 'email', show a generic error message
      if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("password")
      ) {
        errorMessage = "Invalid login credentials.\nPlease try again.";
      }

      return { success: false, message: errorMessage };
    }
  } catch (error) {
    console.error("Error logging in:", error);
    return { success: false, message: "An error occurred. Please try again." };
  }
};

export const createAccount = async (emailAddress, password, username) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/user/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailAddress,
        password: password,
        username: username,
      }),
    });

    // Check if the response body is empty
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (response.status === 201) {
      return { success: true, data: data };
    } else {
      return {
        success: false,
        message:
          data.Response?.Message ||
          "An error occurred. Please try again.\nCode: " + response.status,
      };
    }
  } catch (error) {
    console.error("Error creating account:", error);
    // we get back an empty body which triggers this error, but it really isn't an error
    return { success: false, message: "An error occurred. Please try again." };
  }
};

export async function checkEmailExists(emailAddress) {
  try {
    const response = await fetch(`${API_URL}/api/v1/user/check-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailAddress,
      }),
    });

    if (response.status === 200) {
      return { success: true, data: null };
    } else {
      return { success: false, message: response.message };
    }
  } catch (error) {
    console.error("Error checking email:", error);
    return { success: false, message: error };
  }
}

export async function sendVerificationCode(emailAddress) {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/verify/send-verification-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailAddress,
        }),
      }
    );

    const data = await response.json();
    if (response.status === 200) {
      return { success: true, data: data };
    } else {
      return { success: false, message: data.Response.Message };
    }
  } catch (error) {
    // we get back an empty body which triggers this error, but it really isn't an error
    return { success: false, message: "An error occurred. Please try again." };
  }
}

export async function verifyCode(code, emailAddress) {
  try {
    const response = await fetch(`${API_URL}/api/v1/verify/verify-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: code,
        email: emailAddress,
      }),
    });

    const data = await response.json();
    if (response.status === 200) {
      return { success: true, data: data };
    } else {
      return { success: false, message: data.Response.Message };
    }
  } catch (error) {
    // we get back an empty body which triggers this error, but it really isn't an error
    return { success: false, message: "An error occurred. Please try again." };
  }
}

export async function resendVerificationCode(emailAddress) {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/verify/resend-verification-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailAddress,
        }),
      }
    );

    const data = await response.json();
    if (response.status === 200) {
      return { success: true, data: data };
    } else {
      return { success: false, message: data.Response.Message };
    }
  } catch (error) {
    // we get back an empty body which triggers this error, but it really isn't an error
    return { success: false, message: "An error occurred. Please try again." };
  }
}
