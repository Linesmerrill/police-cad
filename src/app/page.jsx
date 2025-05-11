"use client";

import React, { use, useState } from "react";
import Footer from "@/components/Footer";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Hamburger Menu for Mobile */}
      <div className="md:hidden p-4 bg-gray-800 flex justify-between items-center">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-white focus:outline-none"
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
        <h2 className="text-xl font-bold text-blue-400">Lines Police CAD</h2>
      </div>

      {/* Sidebar or Dropdown Menu */}
      <div
        className={`${
          isMenuOpen ? "block" : "hidden"
        } md:block md:w-64 md:p-6 md:bg-gray-800 md:h-screen md:fixed md:top-0 md:left-0`}
      >
        <div className="md:hidden bg-gray-800 p-4">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="text-white mb-4 focus:outline-none"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-bold mb-6 text-blue-400">
            Lines Police CAD
          </h2>
        </div>
        <nav className="md:mt-0">
          <ul className="space-y-4">
            <li>
              <a href="/auth/login" className="text-blue-400 hover:underline">
                Login
              </a>
            </li>
            <li>
              <a
                href="/auth/register"
                className="text-blue-400 hover:underline"
              >
                Sign Up
              </a>
            </li>
            <li>
              <a href="/dashboard" className="text-blue-400 hover:underline">
                Communities
              </a>
            </li>
            <li>
              <a href="/features" className="text-blue-400 hover:underline">
                Features
              </a>
            </li>
            <li>
              <a href="/about" className="text-blue-400 hover:underline">
                About
              </a>
            </li>
            <li>
              <a href="/support" className="text-blue-400 hover:underline">
                Support
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <main className="p-6 md:ml-64">
        {/* Hero Section */}
        <section className="relative mb-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Welcome to Lines Police CAD
            </h1>
            <p className="text-lg mb-6">
              The ultimate free platform to create, discover, and manage
              roleplay communities.
            </p>
            <a
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700"
            >
              Get Started Free
            </a>
          </div>
          {/* Carousel */}
          <div className="flex overflow-x-auto scroll-smooth gap-2.5 p-2.5 mt-6">
            <img
              src="https://via.placeholder.com/300x200?text=Community+1"
              alt="Community 1"
              className="w-[300px] h-[200px] object-cover flex-shrink-0"
            />
            <img
              src="https://via.placeholder.com/300x200?text=Community+2"
              alt="Community 2"
              className="w-[300px] h-[200px] object-cover flex-shrink-0"
            />
            <img
              src="https://via.placeholder.com/300x200?text=Community+3"
              alt="Community 3"
              className="w-[300px] h-[200px] object-cover flex-shrink-0"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Create and Join Communities
              </h3>
              <p>Free and subscription-based tiers to suit your needs.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Promotion Tiers</h3>
              <p>Boost visibility with Home Page placements.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Personalized Experience
              </h3>
              <p>Verified badges, custom departments, and more.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Discover and Connect
              </h3>
              <p>Browse active communities and find your people.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-blue-600 p-6 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">
            Download Lines Police CAD Today
          </h2>
          <p className="mb-6">
            Start building your community empire — connect, promote, and thrive!
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="#"
              className="bg-white text-blue-600 px-6 py-2 rounded hover:bg-gray-200"
            >
              iOS App
            </a>
            <a
              href="#"
              className="bg-white text-blue-600 px-6 py-2 rounded hover:bg-gray-200"
            >
              Android App
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
