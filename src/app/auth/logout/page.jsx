"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include", // Send cookies
        });
      } catch (error) {
        console.error("Logout failed", error);
      } finally {
        router.replace("/"); // Always redirect to login after
      }
    };

    logout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <p className="text-xl">Logging you out...</p>
    </div>
  );
}
