import { checkAuth } from "./check-auth";

export default async function DashboardLayout({ children }) {
  await checkAuth(); // 🛡 Auth check here (server-side)

  return <div>{children}</div>;
}
