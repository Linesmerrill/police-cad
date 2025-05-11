"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function CommunityEventsPagination({ events, communityId }) {
  const [currentPageEvents, setCurrentPageEvents] = useState(1);
  const eventsPerPage = 3;

  const totalPagesEvents = Math.ceil(events.length / eventsPerPage);
  const startIndexEvents = (currentPageEvents - 1) * eventsPerPage;
  const paginatedEvents = events.slice(
    startIndexEvents,
    startIndexEvents + eventsPerPage
  );

  const handleNextPageEvents = () => {
    if (currentPageEvents < totalPagesEvents) {
      setCurrentPageEvents(currentPageEvents + 1);
    }
  };

  const handlePrevPageEvents = () => {
    if (currentPageEvents > 1) {
      setCurrentPageEvents(currentPageEvents - 1);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paginatedEvents.map((event) => (
          <Link
            key={event.id}
            href={`/community/${communityId}/events/${event.id}`}
            className="relative bg-gray-800 p-4 rounded-lg shadow transition-all duration-300 group hover:shadow-xl hover:scale-105 hover:border-2 hover:border-blue-500"
          >
            <div className="absolute inset-0 border-2 border-transparent rounded-lg group-hover:border-blue-500 transition-all duration-300"></div>
            <h3 className="font-bold text-lg mb-2 text-blue-400">
              {event.title}
            </h3>
            <p className="text-gray-400 mb-2">Date: {event.date}</p>
            <p className="text-gray-300">{event.description}</p>
          </Link>
        ))}
      </div>

      {/* Pagination Controls for Events */}
      <div className="flex justify-center items-center mt-4 space-x-4">
        <button
          onClick={handlePrevPageEvents}
          disabled={currentPageEvents === 1}
          className={`p-2 rounded ${
            currentPageEvents === 1
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
          Page {currentPageEvents} of {totalPagesEvents}
        </span>
        <button
          onClick={handleNextPageEvents}
          disabled={currentPageEvents === totalPagesEvents}
          className={`p-2 rounded ${
            currentPageEvents === totalPagesEvents
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
      </div>
    </>
  );
}
