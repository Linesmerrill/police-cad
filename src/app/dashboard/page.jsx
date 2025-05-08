"use client";
import { useState } from "react";
import {
  BellIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  Bars3Icon,
} from "@heroicons/react/24/solid";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col pb-20">
      {/* Header */}
      <header className="p-4 shadow bg-white dark:bg-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
          Dashboard
        </h1>
        <button>
          <BellIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6 max-w-4xl mx-auto w-full">
        {/* Jump Back In */}
        <section className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">
            Jump back into your community
          </h2>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded text-sm">
            Last visited: <strong>San Andreas RP</strong>
            <br />
            <button className="mt-2 text-sm bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
              Open
            </button>
          </div>
        </section>

        {/* Upgrade to Premium */}
        <section className="p-4 bg-yellow-100 dark:bg-yellow-800 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Upgrade to Premium</h2>
          <p className="text-sm">
            Get verified badges, ad-free experience, and more.
          </p>
          <button className="mt-2 bg-yellow-500 text-white px-4 py-1 rounded hover:bg-yellow-600">
            Upgrade Now
          </button>
        </section>

        {/* Friends Online */}
        <section className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Friends Online</h2>
          <ul className="space-y-2 text-sm">
            <li>👤 Cameron Duckett – Online</li>
            <li>👤 Leon – Idle</li>
            <li>👤 Austin – In Game</li>
          </ul>
        </section>

        {/* Spotlight */}
        <section className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Spotlight</h2>
          <p className="text-sm">
            🔥 Featured event: Traffic Stop Scenarios Week
          </p>
        </section>

        {/* Promoted Communities */}
        <section className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Promoted Communities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 border rounded">🌟 Liberty State RP</div>
            <div className="p-4 border rounded">🌟 Blaze County RP</div>
          </div>
        </section>

        {/* Discover People */}
        <section className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Discover People</h2>
          <div className="flex flex-col space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span>👤 patrol_king</span>
              <button className="text-blue-600 hover:underline">Add</button>
            </div>
            <div className="flex justify-between items-center">
              <span>👤 traffic_unit23</span>
              <button className="text-blue-600 hover:underline">Add</button>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Menu (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex justify-around py-2 md:hidden">
        <button
          onClick={() => setActiveTab("home")}
          className="flex flex-col items-center text-sm"
        >
          <HomeIcon className="w-5 h-5" />
          Home
        </button>
        <button
          onClick={() => setActiveTab("communities")}
          className="flex flex-col items-center text-sm"
        >
          <UserGroupIcon className="w-5 h-5" />
          Communities
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className="flex flex-col items-center text-sm"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
          Search
        </button>
        <button
          onClick={() => setActiveTab("menu")}
          className="flex flex-col items-center text-sm"
        >
          <Bars3Icon className="w-5 h-5" />
          Menu
        </button>
      </nav>
    </div>
  );
}
