"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import CommunityEventsPagination from "./CommunityEventsPagination";
import CommunityDepartmentsPagination from "./CommunityDepartmentsPagination";
import { fetchCommunityDetailsById } from "@/services/community";

export default function CommunityClient() {
  // Define breadcrumb paths
  //   const breadcrumbs = [
  //     { label: "Home", href: "/" },
  //     { label: "Dashboard", href: "/dashboard" },
  //     {
  //       label: "LPC Community",
  //       href: `/community/${communityId}`,
  //       isCurrent: true,
  //     },
  //   ];
  const params = useParams();
  const { id } = params;

  console.log("Route params:", params);
  const [community, setCommunity] = useState({});

  useEffect(() => {
    generateMetadata(id);
  }, [id]);

  //   async function fetchCommunity(id) {
  //     const communityData = {
  //       1: {
  //         name: "Community A",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Community+A+Banner",
  //         isMember: true,
  //       },
  //       2: {
  //         name: "Community B",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Community+B+Banner",
  //         isMember: true,
  //       },
  //       3: {
  //         name: "Community C",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Community+C+Banner",
  //         isMember: false,
  //       },
  //       4: {
  //         name: "Community D",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Community+D+Banner",
  //         isMember: true,
  //       },
  //       5: {
  //         name: "Community E",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Community+E+Banner",
  //         isMember: false,
  //       },
  //       6: {
  //         name: "Community F",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Community+F+Banner",
  //         isMember: true,
  //       },
  //       7: {
  //         name: "Suggested A",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Suggested+A+Banner",
  //         isMember: false,
  //       },
  //       8: {
  //         name: "Suggested B",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Suggested+B+Banner",
  //         isMember: false,
  //       },
  //       9: {
  //         name: "Suggested C",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Suggested+C+Banner",
  //         isMember: false,
  //       },
  //       10: {
  //         name: "Suggested D",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Suggested+D+Banner",
  //         isMember: false,
  //       },
  //       11: {
  //         name: "Suggested E",
  //         bannerImage:
  //           "https://via.placeholder.com/1200x400?text=Suggested+E+Banner",
  //         isMember: false,
  //       },
  //     };

  //     const community = communityData[id] || {
  //       name: "Unknown Community",
  //       bannerImage: "https://via.placeholder.com/1200x400?text=Default+Banner",
  //       isMember: false,
  //     };
  //     if (!communityData[id]) {
  //       throw new Error("Community not found");
  //     }
  //     return community;
  //   }

  // Mock data for friends
  const friends = {
    "Sheriff Services": [
      {
        id: 1,
        name: "Merrill",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=M",
      },
      {
        id: 2,
        name: "Chase H.",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=C",
      },
    ],
    "Fire & EMS": [
      {
        id: 3,
        name: "FlyingFord069",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=F",
      },
    ],
    Civilian: [
      {
        id: 4,
        name: "alexk105",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=A",
      },
      {
        id: 5,
        name: "codthecod",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=C",
      },
      {
        id: 6,
        name: "Ethan",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=E",
      },
      {
        id: 7,
        name: "Liedzn",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=L",
      },
      {
        id: 8,
        name: "Millsby027",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=M",
      },
      {
        id: 9,
        name: "Mr LavaStorm",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=M",
      },
      {
        id: 10,
        name: "Sheriff B. Stone",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=S",
      },
      {
        id: 11,
        name: "Kermit",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=K",
      },
    ],
  };

  // Mock data for events and departments
  const events = [
    {
      id: 1,
      title: "Roleplay Night",
      date: "2025-05-10",
      description: "Join us for an immersive roleplay session!",
    },
    {
      id: 2,
      title: "Community Meeting",
      date: "2025-05-12",
      description: "Discuss upcoming events and updates.",
    },
    {
      id: 3,
      title: "Training Session",
      date: "2025-05-15",
      description: "Learn new skills for your role.",
    },
    {
      id: 4,
      title: "Patrol Event",
      date: "2025-05-18",
      description: "Participate in a group patrol.",
    },
    {
      id: 5,
      title: "Social Gathering",
      date: "2025-05-20",
      description: "Meet and chat with other members.",
    },
  ];

  const departments = [
    {
      id: 1,
      name: "Sheriff Services",
      description: "Handles law enforcement and patrols.",
    },
    {
      id: 2,
      name: "Fire & EMS",
      description: "Provides emergency medical services and fire response.",
    },
    {
      id: 3,
      name: "Civilian",
      description: "Citizens and non-emergency roles.",
    },
    {
      id: 4,
      name: "Dispatch",
      description: "Coordinates communications and responses.",
    },
    {
      id: 5,
      name: "Highway Patrol",
      description: "Focuses on traffic enforcement and safety.",
    },
  ];

  // Define breadcrumb paths
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "LPC Community", href: `/community/${id}`, isCurrent: true },
  ];

  async function generateMetadata(communityId) {
    const authToken = localStorage.getItem("authToken");
    const community = await fetchCommunityDetailsById(
      communityId,
      authToken
    ).catch(() => ({
      name: "Unknown Community",
    }));
    console.log("community", community);
    setCommunity(community);
    return {
      title: `${community?.community?.name} - Lines Police CAD`,
    };
  }

  //   async function generateStaticParams() {
  //     return [
  //       { id: "1" },
  //       { id: "2" },
  //       { id: "3" },
  //       { id: "4" },
  //       { id: "5" },
  //       { id: "6" },
  //       { id: "7" },
  //       { id: "8" },
  //       { id: "9" },
  //       { id: "10" },
  //       { id: "11" },
  //     ];
  //   }

  // Calculate total online friends
  const totalOnline = Object.values(friends)
    .flat()
    .filter((friend) => friend.status === "10-8").length;

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold text-blue-400 hover:underline"
        >
          {community?.community?.name}
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

      {/* Main Layout */}
      <div className="relative">
        {/* Background Image */}
        <div className="relative">
          <img
            src={
              community?.community?.imageLink ||
              "https://res.cloudinary.com/dqtwwvm7p/image/upload/v1746915829/temp-community-image_ebspfe.jpg"
            }
            alt={`${community.name} Banner`}
            className="w-full h-64 object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{community.name}</h1>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex">
          {/* Main Content */}
          <main
            className={`flex-1 p-6 ${community.isMember ? "md:mr-72" : ""}`}
          >
            {/* Community Events */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Community Events</h2>
              <CommunityEventsPagination events={events} communityId={id} />
            </section>

            {/* Departments */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Departments</h2>
              <CommunityDepartmentsPagination
                departments={departments}
                communityId={id}
              />
            </section>
          </main>

          {/* Friends Sidebar (if member) */}
          {community.isMember && (
            <aside className="w-72 bg-gray-900 p-4 h-[calc(100vh-64px)] overflow-y-auto md:sticky md:top-16 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {Object.entries(friends).map(
                ([department, departmentFriends]) => (
                  <div key={department} className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">
                      {department} — {departmentFriends.length}
                    </h3>
                    <ul className="space-y-2">
                      {departmentFriends.map((friend) => (
                        <li key={friend.id} className="flex items-center">
                          <img
                            src={friend.avatar}
                            alt={`${friend.name}'s avatar`}
                            className="w-8 h-8 rounded-full mr-2 object-cover"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-white text-sm truncate">
                              {friend.name}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                friend.status === "10-8"
                                  ? "bg-green-600"
                                  : "bg-gray-600"
                              }`}
                            >
                              {friend.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
              <div className="text-sm text-gray-400 mt-4">
                Online — {totalOnline}
              </div>
            </aside>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );

  //   return (
  //     <div className="bg-gray-900 text-white min-h-screen">
  //       {/* Header */}
  //       <header className="bg-gray-800 p-4 flex justify-between items-center">
  //         <Link
  //           href="/"
  //           className="text-2xl font-bold text-blue-400 hover:underline"
  //         >
  //           Lines Police CAD
  //         </Link>
  //         <a href="/auth/logout" className="text-blue-400 hover:underline">
  //           Logout
  //         </a>
  //       </header>

  //       {/* Breadcrumbs */}
  //       <nav className="bg-gray-800 p-2 pl-4">
  //         <ol className="flex space-x-2 text-sm">
  //           {breadcrumbs.map((crumb, index) => (
  //             <li key={index} className="flex items-center">
  //               {index > 0 && <span className="mx-2 text-gray-400">→</span>}
  //               {crumb.isCurrent ? (
  //                 <span className="text-white">{crumb.label}</span>
  //               ) : (
  //                 <Link
  //                   href={crumb.href}
  //                   className="text-blue-400 hover:underline"
  //                 >
  //                   {crumb.label}
  //                 </Link>
  //               )}
  //             </li>
  //           ))}
  //         </ol>
  //       </nav>

  //       {/* Main Content */}
  //       <div className="relative">
  //         {/* Background Image */}
  //         <div className="relative">
  //           <img
  //             src={community.bannerImage}
  //             alt={`${community.name} Banner`}
  //             className="w-full h-64 object-cover opacity-50"
  //           />
  //           <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
  //           <div className="absolute inset-0 flex items-center justify-center">
  //             <h1 className="text-4xl font-bold text-white">{community.name}</h1>
  //           </div>
  //         </div>

  //         {/* Departments List */}
  //         <main className="p-6">
  //           <h2 className="text-2xl font-semibold mb-4">Departments</h2>
  //           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  //             {/* Mock departments */}
  //             <Link
  //               href={`/community/${communityId}/departments/1`}
  //               className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
  //             >
  //               Sheriff Services
  //             </Link>
  //             <Link
  //               href={`/community/${communityId}/departments/2`}
  //               className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
  //             >
  //               Fire & EMS
  //             </Link>
  //             <Link
  //               href={`/community/${communityId}/departments/3`}
  //               className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
  //             >
  //               Civilian
  //             </Link>
  //             <Link
  //               href={`/community/${communityId}/departments/4`}
  //               className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
  //             >
  //               Dispatch
  //             </Link>
  //             <Link
  //               href={`/community/${communityId}/departments/5`}
  //               className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
  //             >
  //               Highway Patrol
  //             </Link>
  //           </div>
  //         </main>
  //       </div>

  //       <Footer />
  //     </div>
  //   );
}
