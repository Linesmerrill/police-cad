"use client";

import React, { useState } from "react";
import Link from "next/link";

// Mock active BOLOs data (replace with real API call)
const mockActiveBolos = {
  1: [
    {
      id: 1,
      title: "BOLO: Suspect John Doe",
      details: "Wanted for robbery",
      issued: "2025-05-08",
    },
    {
      id: 2,
      title: "BOLO: Stolen Vehicle",
      details: "Black SUV, Plate XYZ123",
      issued: "2025-05-07",
    },
    {
      id: 3,
      title: "Warrant: Jane Smith",
      details: "Arrest warrant issued",
      issued: "2025-05-06",
    },
    {
      id: 4,
      title: "BOLO: Armed Robber",
      details: "Last seen near Main St",
      issued: "2025-05-05",
    },
  ],
  2: [
    {
      id: 5,
      title: "BOLO: Fire Arsonist",
      details: "Suspect linked to warehouse fire",
      issued: "2025-05-08",
    },
    {
      id: 6,
      title: "BOLO: Missing Person",
      details: "Elderly male, last seen Elm St",
      issued: "2025-05-07",
    },
  ],
  3: [],
  4: [],
  5: [
    {
      id: 7,
      title: "BOLO: Speeding Suspect",
      details: "Red sports car, I-95",
      issued: "2025-05-09",
    },
  ],
};

export default function ActiveBolosList({ communityId, deptId }) {
  const [currentPage, setCurrentPage] = useState(1);
  const bolosPerPage = 3;
  const bolos = mockActiveBolos[deptId] || [];

  const totalPages = Math.ceil(bolos.length / bolosPerPage);
  const startIndex = (currentPage - 1) * bolosPerPage;
  const paginatedBolos = bolos.slice(startIndex, startIndex + bolosPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <>
      <div className="space-y-4">
        {paginatedBolos.map((bolo) => (
          <Link
            key={bolo.id}
            href={`/community/${communityId}/departments/${deptId}/bolo/${bolo.id}`}
            className="relative block bg-gray-800 p-4 rounded-lg shadow transition-all duration-300 group hover:shadow-xl hover:scale-105 hover:border-2 hover:border-blue-500"
          >
            <div className="absolute inset-0 border-2 border-transparent rounded-lg group-hover:border-blue-500 transition-all duration-300"></div>
            <h3 className="font-bold text-lg mb-2">{bolo.title}</h3>
            <p className="text-gray-400">Details: {bolo.details}</p>
            <p className="text-gray-400">Issued: {bolo.issued}</p>
          </Link>
        ))}
      </div>
      {bolos.length > 0 && (
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
