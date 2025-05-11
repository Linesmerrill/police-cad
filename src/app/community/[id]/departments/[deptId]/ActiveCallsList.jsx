"use client";

import React, { useState } from "react";
import Link from "next/link";

// Mock active calls data (replace with real API call)
const mockActiveCalls = {
  1: [
    {
      id: 1,
      title: "Robbery in Progress",
      location: "Main St",
      time: "2025-05-09 14:30",
    },
    {
      id: 2,
      title: "Traffic Accident",
      location: "Highway 101",
      time: "2025-05-09 15:00",
    },
    {
      id: 3,
      title: "Domestic Disturbance",
      location: "Oak Ave",
      time: "2025-05-09 15:30",
    },
    {
      id: 4,
      title: "Shots Fired",
      location: "Downtown",
      time: "2025-05-09 16:00",
    },
    {
      id: 5,
      title: "Suspicious Activity",
      location: "Park Rd",
      time: "2025-05-09 16:30",
    },
  ],
  2: [
    {
      id: 6,
      title: "Fire at Warehouse",
      location: "Industrial Zone",
      time: "2025-05-09 14:45",
    },
    {
      id: 7,
      title: "Medical Emergency",
      location: "Elm St",
      time: "2025-05-09 15:15",
    },
    {
      id: 8,
      title: "Car Fire",
      location: "Route 66",
      time: "2025-05-09 15:45",
    },
  ],
  3: [],
  4: [],
  5: [
    {
      id: 9,
      title: "Speeding Incident",
      location: "I-95",
      time: "2025-05-09 14:20",
    },
    {
      id: 10,
      title: "Roadblock",
      location: "Exit 12",
      time: "2025-05-09 15:50",
    },
  ],
};

export default function ActiveCallsList({ communityId, deptId }) {
  const [currentPage, setCurrentPage] = useState(1);
  const callsPerPage = 3;
  const calls = mockActiveCalls[deptId] || [];

  const totalPages = Math.ceil(calls.length / callsPerPage);
  const startIndex = (currentPage - 1) * callsPerPage;
  const paginatedCalls = calls.slice(startIndex, startIndex + callsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <>
      <div className="space-y-4">
        {paginatedCalls.map((call) => (
          <Link
            key={call.id}
            href={`/community/${communityId}/departments/${deptId}/call/${call.id}`}
            className="relative block bg-gray-800 p-4 rounded-lg shadow transition-all duration-300 group hover:shadow-xl hover:scale-105 hover:border-2 hover:border-blue-500"
          >
            <div className="absolute inset-0 border-2 border-transparent rounded-lg group-hover:border-blue-500 transition-all duration-300"></div>
            <h3 className="font-bold text-lg mb-2">{call.title}</h3>
            <p className="text-gray-400">Location: {call.location}</p>
            <p className="text-gray-400">Time: {call.time}</p>
          </Link>
        ))}
      </div>
      {calls.length > 0 && (
        <div className="flex items-center mt-4 space-x-4">
          {totalPages > 1 && (
            <>
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded ${
                  currentPage === 1
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded ${
                  currentPage === totalPages
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
