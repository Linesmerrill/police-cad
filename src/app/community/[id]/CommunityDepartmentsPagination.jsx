"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function CommunityDepartmentsPagination({
  departments,
  communityId,
}) {
  const [currentPageDepartments, setCurrentPageDepartments] = useState(1);
  const departmentsPerPage = 3;

  const totalPagesDepartments = Math.ceil(
    departments.length / departmentsPerPage
  );
  const startIndexDepartments =
    (currentPageDepartments - 1) * departmentsPerPage;
  const paginatedDepartments = departments.slice(
    startIndexDepartments,
    startIndexDepartments + departmentsPerPage
  );

  const handleNextPageDepartments = () => {
    if (currentPageDepartments < totalPagesDepartments) {
      setCurrentPageDepartments(currentPageDepartments + 1);
    }
  };

  const handlePrevPageDepartments = () => {
    if (currentPageDepartments > 1) {
      setCurrentPageDepartments(currentPageDepartments - 1);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paginatedDepartments.map((department) => (
          <Link
            key={department.id}
            href={`/community/${communityId}/departments/${department.id}`}
            className="relative bg-gray-800 p-4 rounded-lg shadow transition-all duration-300 group hover:shadow-xl hover:scale-105 hover:border-2 hover:border-blue-500"
          >
            <div className="absolute inset-0 border-2 border-transparent rounded-lg group-hover:border-blue-500 transition-all duration-300"></div>
            <h3 className="font-bold text-lg mb-2">{department.name}</h3>
            <p className="text-gray-400">{department.description}</p>
          </Link>
        ))}
      </div>

      {/* Pagination Controls for Departments */}
      <div className="flex justify-center items-center mt-4 space-x-4">
        <button
          onClick={handlePrevPageDepartments}
          disabled={currentPageDepartments === 1}
          className={`p-2 rounded ${
            currentPageDepartments === 1
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
          Page {currentPageDepartments} of {totalPagesDepartments}
        </span>
        <button
          onClick={handleNextPageDepartments}
          disabled={currentPageDepartments === totalPagesDepartments}
          className={`p-2 rounded ${
            currentPageDepartments === totalPagesDepartments
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
