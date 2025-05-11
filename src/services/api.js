import { serialize, parse } from "cookie";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  const encoded = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessageMatch = data.message.match(/\[(.*?),/);
      let errorMessage = errorMessageMatch
        ? errorMessageMatch[1]
        : data.message || "Login failed";

      if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("password")
      ) {
        errorMessage = "Invalid login credentials.\nPlease try again.";
      }

      return res.status(401).json({ success: false, message: errorMessage });
    }

    // ✅ If login successful, set cookie
    res.setHeader("Set-Cookie", [
      serialize("authToken", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
        sameSite: "lax",
      }),
      serialize("userId", data._id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        sameSite: "lax",
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

// makeApiCall is a helper function that makes an authenticated API call
// to the backend. It takes a URL and an options object as arguments.
export const makeApiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include", // 👈 VERY important: send cookies like authToken
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
};

export const logoutUser = async (req, res) => {
  // Clear cookies
  res.setHeader("Set-Cookie", [
    serialize("authToken", "", { maxAge: -1, path: "/" }),
    serialize("userId", "", { maxAge: -1, path: "/" }),
  ]);

  return res.status(200).json({ success: true });
};

export const fetchToken = (req) => {
  const cookies = parse(req.headers.cookie || "");
  return cookies.authToken || null;
};

export const fetchUserId = (req) => {
  const cookies = parse(req.headers.cookie || "");
  return cookies.userId || null;
};
