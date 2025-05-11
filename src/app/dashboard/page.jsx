import { checkAuth } from "./check-auth";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  checkAuth(); // ✅ server-side cookie check

  return <DashboardClient />; // ✅ client-side dashboard rendering
}
