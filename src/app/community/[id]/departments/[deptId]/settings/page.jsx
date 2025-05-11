import Link from "next/link";

// Mock department and community fetch (reuse logic from parent)
async function fetchDepartment(communityId, deptId) {
  const departments = {
    1: {
      id: 1,
      name: "Sheriff Services",
      description: "Handles law enforcement and patrols.",
      details:
        "Our Sheriff Services team is dedicated to maintaining law and order.",
      type: "police",
    },
    2: {
      id: 2,
      name: "Fire & EMS",
      description: "Provides emergency medical services and fire response.",
      details: "We respond to emergencies with speed and care.",
      type: "fire_ems",
    },
    3: {
      id: 3,
      name: "Civilian",
      description: "Citizens and non-emergency roles.",
      details: "Civilians play a key role in our community activities.",
      type: "civilian",
    },
    4: {
      id: 4,
      name: "Dispatch",
      description: "Coordinates communications and responses.",
      details: "Dispatch ensures smooth communication during operations.",
      type: "dispatch",
    },
    5: {
      id: 5,
      name: "Highway Patrol",
      description: "Focuses on traffic enforcement and safety.",
      details: "Highway Patrol keeps our roads safe.",
      type: "police",
    },
  };

  const department = departments[deptId] || null;
  if (!department) {
    throw new Error("Department not found");
  }
  return department;
}

async function fetchCommunity(communityId) {
  const communityData = {
    1: {
      name: "Community A",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Community+A+Banner",
    },
    2: {
      name: "Community B",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Community+B+Banner",
    },
    3: {
      name: "Community C",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Community+C+Banner",
    },
    4: {
      name: "Community D",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Community+D+Banner",
    },
    5: {
      name: "Community E",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Community+E+Banner",
    },
    6: {
      name: "Community F",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Community+F+Banner",
    },
    7: {
      name: "Suggested A",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Suggested+A+Banner",
    },
    8: {
      name: "Suggested B",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Suggested+B+Banner",
    },
    9: {
      name: "Suggested C",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Suggested+C+Banner",
    },
    10: {
      name: "Suggested D",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Suggested+D+Banner",
    },
    11: {
      name: "Suggested E",
      bannerImage:
        "https://via.placeholder.com/1200x400?text=Suggested+E+Banner",
    },
  };

  const community = communityData[communityId] || {
    name: "Unknown Community",
    bannerImage: "https://via.placeholder.com/1200x400?text=Default+Banner",
  };
  if (!communityData[communityId]) {
    throw new Error("Community not found");
  }
  return community;
}

export default async function SettingsPage({ params }) {
  const { id: communityId, deptId } = params;
  const department = await fetchDepartment(communityId, deptId);
  const community = await fetchCommunity(communityId);

  // Define breadcrumb paths
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "LPC Community", href: `/community/${communityId}` },
    {
      label: department.name,
      href: `/community/${communityId}/departments/${deptId}`,
    },
    {
      label: "Settings",
      href: `/community/${communityId}/departments/${deptId}/settings`,
      isCurrent: true,
    },
  ];

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold text-blue-400 hover:underline"
        >
          Lines Police CAD
        </Link>
        <a href="/auth/logout" className="text-blue-400 hover:underline">
          Logout
        </a>
      </header>

      {/* Breadcrumbs */}
      <nav className="bg-gray-800 p-2 pl-4">
        <ol className="flex space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">→</span>}
              {crumb.isCurrent ? (
                <span className="text-white">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-blue-400 hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-4">{department.name} Settings</h1>
        <p className="mb-4">
          Manage settings for {department.name} in {community.name}.
        </p>
        {/* Add settings form or content here */}
      </main>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { id: communityId, deptId } = params;
  const department = await fetchDepartment(communityId, deptId).catch(() => ({
    name: "Unknown Department",
  }));
  return {
    title: `${department.name} Settings - Lines Police CAD`,
  };
}

export async function generateStaticParams() {
  const communityIds = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
  ];
  const deptIds = ["1", "2", "3", "4", "5"];

  const paths = [];
  for (const communityId of communityIds) {
    for (const deptId of deptIds) {
      paths.push({ id: communityId, deptId });
    }
  }

  return paths;
}
