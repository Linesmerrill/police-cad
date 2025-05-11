"use client";

import React from "react";

// Mock friends data (replace with real API call)
const friends = {
  1: {
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
    "Highway Patrol": [
      {
        id: 4,
        name: "Patrol Officer",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=P",
      },
    ],
  },
  2: {
    "Sheriff Services": [
      {
        id: 5,
        name: "Sheriff B.",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=S",
      },
    ],
    "Fire & EMS": [
      {
        id: 6,
        name: "EMS Lead",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=E",
      },
    ],
    "Highway Patrol": [
      {
        id: 7,
        name: "Highway Pat",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=H",
      },
    ],
  },
  3: {
    "Sheriff Services": [
      {
        id: 8,
        name: "Deputy D.",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=D",
      },
    ],
    "Fire & EMS": [
      {
        id: 9,
        name: "Fire Chief",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=F",
      },
    ],
    "Highway Patrol": [
      {
        id: 10,
        name: "Traffic Cop",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=T",
      },
    ],
  },
  4: {
    "Sheriff Services": [
      {
        id: 11,
        name: "Officer K.",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=O",
      },
    ],
    "Fire & EMS": [
      {
        id: 12,
        name: "Paramedic P.",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=P",
      },
    ],
    "Highway Patrol": [
      {
        id: 13,
        name: "Road Ranger",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=R",
      },
    ],
  },
  5: {
    "Sheriff Services": [
      {
        id: 14,
        name: "Sergeant S.",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=S",
      },
    ],
    "Fire & EMS": [
      {
        id: 15,
        name: "Rescue R.",
        status: "10-7",
        avatar: "https://via.placeholder.com/40?text=R",
      },
    ],
    "Highway Patrol": [
      {
        id: 16,
        name: "Speed Enforcer",
        status: "10-8",
        avatar: "https://via.placeholder.com/40?text=S",
      },
    ],
  },
};

export default function DepartmentSidebar({ deptId }) {
  const departmentFriends = friends[deptId] || {};

  const totalOnline = Object.values(departmentFriends)
    .flat()
    .filter((friend) => friend.status === "10-8").length;

  return (
    <aside className="w-72 bg-gray-900 p-4 h-[calc(100vh-64px)] overflow-y-auto md:sticky md:top-16 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      {Object.entries(departmentFriends).map(
        ([department, departmentFriendsList]) => (
          <div key={department} className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              {department} — {departmentFriendsList.length}
            </h3>
            <ul className="space-y-2">
              {departmentFriendsList.map((friend) => (
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
      <div className="text-sm text-gray-400 mt-4">Online — {totalOnline}</div>
    </aside>
  );
}
