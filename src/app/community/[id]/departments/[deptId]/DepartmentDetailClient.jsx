"use client";

import React, { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import DepartmentSidebar from "./DepartmentSidebar";
import ActiveCallsList from "./ActiveCallsList";
import ActiveBolosList from "./ActiveBolosList";

export default function DepartmentDetailClient({
  communityId,
  deptId,
  department,
  community,
  stats,
}) {
  const isEmergencyService = ["police", "fire_ems"].includes(department.type);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Define breadcrumb paths (mock URLs; adjust based on your routing)
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "LPC Community", href: `/community/${communityId}` },
    {
      label: department.name,
      href: `/community/${communityId}/departments/${deptId}`,
      isCurrent: true,
    },
  ];

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center relative">
        <Link
          href="/"
          className="text-2xl font-bold text-blue-400 hover:underline"
        >
          Lines Police CAD
        </Link>
        <div className="flex items-center">
          <a href="/auth/logout" className="text-blue-400 hover:underline mr-4">
            Logout
          </a>
          {isEmergencyService && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden text-white focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          )}
        </div>
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
            src={community.bannerImage}
            alt={`${community.name} Banner`}
            className="w-full h-64 object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{department.name}</h1>
            {/* Settings Link with Gear Icon */}
            <Link
              href={`/community/${communityId}/departments/${deptId}/settings`}
              className="mt-4 flex flex-col items-center text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm mt-1">Settings</span>
            </Link>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex">
          {/* Main Content */}
          <main
            className={`flex-1 p-6 ${isEmergencyService ? "md:mr-72" : ""}`}
          >
            {/* Department Type Buttons (Police-specific for now) */}
            {department.type === "police" && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  href={`/community/${communityId}/departments/${deptId}/10codes`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  10 Codes
                </Link>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/person-search`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  Person Search
                </Link>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/vehicle-search`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  Vehicle Search
                </Link>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/firearm-search`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  Firearm Search
                </Link>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/create-bolo`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  Create BOLO
                </Link>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/view-bolos`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  View BOLOs/Warrants
                </Link>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/notepad`}
                  className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 text-center"
                >
                  Notepad
                </Link>
              </div>
            )}

            {/* Stats Cards */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold">Active BOLOs</h3>
                <p className="text-2xl">{stats.activeBolos}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold">Active Calls</h3>
                <p className="text-2xl">{stats.activeCalls}</p>
              </div>
            </div>

            {/* Active Calls */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Active Calls</h2>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/calls-search`}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  See All
                </Link>
              </div>
              <ActiveCallsList communityId={communityId} deptId={deptId} />
            </section>

            {/* Active BOLOs */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Active BOLOs</h2>
                <Link
                  href={`/community/${communityId}/departments/${deptId}/bolos-search`}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  See All
                </Link>
              </div>
              <ActiveBolosList communityId={communityId} deptId={deptId} />
            </section>
          </main>

          {/* Friends Sidebar (for emergency services only) */}
          {isEmergencyService && (
            <>
              <div
                className={`fixed inset-0 bg-gray-900 bg-opacity-75 z-50 transform ${
                  isSidebarOpen ? "translate-x-0" : "translate-x-full"
                } transition-transform duration-300 md:hidden`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <div
                  className="w-72 h-full bg-gray-900 p-4 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DepartmentSidebar deptId={deptId} />
                </div>
              </div>
              <aside
                className={`w-72 bg-gray-900 p-4 h-[calc(100vh-64px)] overflow-y-auto md:sticky md:top-16 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 ${
                  isSidebarOpen ? "" : "hidden"
                } md:block`}
              >
                <DepartmentSidebar deptId={deptId} />
              </aside>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
