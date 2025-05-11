import { serialize } from "cookie";

const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end(); // Method Not Allowed
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

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
      return res.status(401).json({ message: data.message || "Login failed" });
    }

    // Set secure HttpOnly cookie
    res.setHeader(
      "Set-Cookie",
      serialize("authToken", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      })
    );

    // ✅ Return userId back to client
    return res
      .status(200)
      .json({ success: true, userId: data._id, authToken: data.token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
