import React from "react";
import DepartmentDetailClient from "./DepartmentDetailClient";

// Fetch department data (mock for now; replace with real API call)
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

// Fetch community data (mock for now; replace with real API call)
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

// Mock stats data
async function fetchStats(deptId) {
  return {
    activeBolos: 5,
    activeCalls: 3,
  };
}

export default async function DepartmentDetail({ params }) {
  const { id: communityId, deptId } = params;
  const department = await fetchDepartment(communityId, deptId);
  const community = await fetchCommunity(communityId);
  const stats = await fetchStats(deptId);

  return (
    <DepartmentDetailClient
      communityId={communityId}
      deptId={deptId}
      department={department}
      community={community}
      stats={stats}
    />
  );
}

export async function generateMetadata({ params }) {
  const { id: communityId, deptId } = params;
  const department = await fetchDepartment(communityId, deptId).catch(() => ({
    name: "Unknown Department",
  }));
  return {
    title: `${department.name} - Lines Police CAD`,
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
