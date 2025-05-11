import { checkAuth } from "./check-auth";
import CommunityClient from "./CommunityClient";

export default function CommunityPage() {
  checkAuth(); // ✅ server-side cookie check

  return <CommunityClient />; // ✅ client-side community rendering
}
