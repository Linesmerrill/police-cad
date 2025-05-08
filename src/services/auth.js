const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

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

    const data = await response.json();
    if (response.code === 201) {
      return { success: true, data: data };
    } else {
      return { success: false, message: data.Response.Message };
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
