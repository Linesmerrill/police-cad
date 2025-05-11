import React from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

// Fetch event data (mock for now; replace with real API call)
async function fetchEvent(communityId, eventId) {
  const events = {
    1: {
      id: 1,
      title: "Roleplay Night",
      date: "2025-05-10",
      description: "Join us for an immersive roleplay session!",
      details:
        "This event includes a full roleplay scenario with interactive missions.",
    },
    2: {
      id: 2,
      title: "Community Meeting",
      date: "2025-05-12",
      description: "Discuss upcoming events and updates.",
      details: "We will cover the community roadmap and take feedback.",
    },
    3: {
      id: 3,
      title: "Training Session",
      date: "2025-05-15",
      description: "Learn new skills for your role.",
      details: "Training will focus on advanced roleplay techniques.",
    },
    4: {
      id: 4,
      title: "Patrol Event",
      date: "2025-05-18",
      description: "Participate in a group patrol.",
      details: "Join other members for a coordinated patrol activity.",
    },
    5: {
      id: 5,
      title: "Social Gathering",
      date: "2025-05-20",
      description: "Meet and chat with other members.",
      details: "A casual event to network and socialize.",
    },
  };

  const event = events[eventId] || null;
  if (!event) {
    throw new Error("Event not found");
  }
  return event;
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

export default async function EventDetail({ params }) {
  const { id: communityId, eventId } = params;
  const event = await fetchEvent(communityId, eventId);
  const community = await fetchCommunity(communityId);

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

      {/* Main Layout */}
      <div className="relative">
        {/* Background Image */}
        <div className="relative">
          <img
            src={community.bannerImage}
            alt={`${community.name} Banner`}
            className="w-full h-64 object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{event.title}</h1>
          </div>
        </div>

        {/* Content */}
        <main className="p-6">
          <div className="max-w-3xl mx-auto bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">{event.title}</h2>
            <p className="text-gray-400 mb-2">Date: {event.date}</p>
            <p className="text-gray-300 mb-4">{event.description}</p>
            <p className="text-gray-300">{event.details}</p>
            <Link
              href={`/community/${communityId}`}
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Community
            </Link>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { id: communityId, eventId } = params;
  const event = await fetchEvent(communityId, eventId).catch(() => ({
    title: "Unknown Event",
  }));
  return {
    title: `${event.title} - Lines Police CAD`,
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
  const eventIds = ["1", "2", "3", "4", "5"];

  const paths = [];
  for (const communityId of communityIds) {
    for (const eventId of eventIds) {
      paths.push({ id: communityId, eventId });
    }
  }

  return paths;
}
