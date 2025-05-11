import { cookies } from "next/headers";
import { redirect } from "next/navigation"; // 👈 separate import!

export async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken");

  if (!token) {
    throw redirect("/auth/login"); // 👈 now it works
  }
}
