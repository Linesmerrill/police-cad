import { serialize } from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end(); // Method Not Allowed
  }

  // Clear the cookie
  res.setHeader(
    "Set-Cookie",
    serialize("authToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0), // <-- Expire immediately
      path: "/",
    })
  );

  return res.status(200).json({ success: true });
}
