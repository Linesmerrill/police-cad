"use client"; // VERY IMPORTANT

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  fetchCommunityDetailsById,
  fetchUserCommunities,
} from "@/services/community";
import { fetchRandomCommunities } from "@/services/user";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { fetchLastAccessedCommunity } from "@/services/lastAccessedCommunity";
import JumpBackInCard from "@/components/JumpBackInCard";

export default function DashboardClient() {
  const [currentPageYour, setCurrentPageYour] = useState(1);
  const [currentPageSuggested, setCurrentPageSuggested] = useState(1);
  const [yourCommunities, setYourCommunities] = useState([]);
  const [suggestedCommunities, setSuggestedCommunities] = useState([]);
  const [lastCommunity, setLastCommunity] = useState({});

  const communitiesPerPage = 3;
  // Define breadcrumb paths
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard", isCurrent: true },
  ];

  // Mock data
  //   const lastCommunity = {};
  //   { id: 1, name: "Last Community", link: "/community/1" };
  //   const yourCommunities = [];

  useEffect(() => {
    const getLastCommunity = async () => {
      try {
        const userId = localStorage.getItem("userId");
        const userToken = localStorage.getItem("authToken");
        const resp = await fetchLastAccessedCommunity(userId, userToken);
        console.log("resp", resp);
        setLastCommunity(resp);
      } catch (error) {
        console.error("Error fetching last community:", error);
      }
    };
    getLastCommunity();
  }, []);

  useEffect(() => {
    const getUserCommunities = async () => {
      try {
        // Fetch your communities from the API
        const userId = localStorage.getItem("userId");
        const userToken = localStorage.getItem("authToken");
        const resp = await fetchUserCommunities(
          userId,
          userToken,
          3,
          currentPageYour,
          "status:approved"
        );

        console.log("resp", resp);
        // for each community, we need to then call and populate the data
        const populatedCommunities = await Promise.all(
          resp.map(async (community) => {
            const communityDetails = await fetchCommunityDetailsById(
              community.communityId,
              userToken
            );
            return {
              ...community,
              community: communityDetails,
            };
          })
        );
        console.log("populatedCommunities", populatedCommunities);

        setYourCommunities(populatedCommunities);
      } catch (error) {
        console.error("Error fetching communities:", error);
      }
    };
    getUserCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSuggestedCommunities = async () => {
    console.log("Calling getSuggestedCommunities");
    console.log("currentPageSuggested", currentPageSuggested);
    try {
      const userId = localStorage.getItem("userId");
      const userToken = localStorage.getItem("authToken");
      const resp = await fetchRandomCommunities(
        userId,
        userToken,
        3,
        currentPageSuggested,
        "visibility:public"
      );

      if (resp.length === 0) {
        console.log("No more suggested communities to load.");
        return; // Stop if no more data
      }

      // ✅ Instead of overwriting, append the new results
      setSuggestedCommunities((prev) => [...prev, ...resp]);
    } catch (error) {
      console.error("Error fetching communities:", error);
    }
  };

  useEffect(() => {
    getSuggestedCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageSuggested]);

  // Pagination logic for Your Communities
  const totalPagesYour = Math.ceil(yourCommunities.length / communitiesPerPage);
  const startIndexYour = (currentPageYour - 1) * communitiesPerPage;
  const paginatedYourCommunities = yourCommunities.slice(
    startIndexYour,
    startIndexYour + communitiesPerPage
  );

  const handleNextPageYour = () => {
    // if (currentPageYour < totalPagesYour) {
    //   setCurrentPageYour(currentPageYour + 1);
    // }
    setCurrentPageYour((prev) => prev + 1);
  };

  const handlePrevPageYour = () => {
    if (currentPageYour > 1) {
      setCurrentPageYour(currentPageYour - 1);
    }
  };

  // Pagination logic for Suggested Communities
  const totalPagesSuggested = Math.ceil(
    suggestedCommunities.length / communitiesPerPage
  );
  const startIndexSuggested = (currentPageSuggested - 1) * communitiesPerPage;
  const paginatedSuggestedCommunities = suggestedCommunities.slice(
    startIndexSuggested,
    startIndexSuggested + communitiesPerPage
  );

  const handleNextPageSuggested = () => {
    setCurrentPageSuggested((prev) => prev + 1);
  };

  const handlePrevPageSuggested = () => {
    if (currentPageSuggested > 1) {
      setCurrentPageSuggested(currentPageSuggested - 1);
    }
  };

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

      {/* Main Content */}
      <main className="p-6">
        {/* Jump Back In */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Jump Back In</h2>
          <JumpBackInCard
            communityName={lastCommunity?.community?.name}
            lastAccessed={lastCommunity?.lastAccessed}
            image={lastCommunity?.community?.imageLink}
            href={`/community/${lastCommunity?._id}`}
          />

          {/* <p className="mb-2">
            Last Community: {lastCommunity?.community?.name}
          </p>
          <Link
            href={`/community/${lastCommunity?._id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Join {lastCommunity?.community?.name}
          </Link> */}
        </section>

        {/* Your Communities with Pagination */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Communities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedYourCommunities?.map((community) => (
              <Link
                key={community?.community?._id}
                href={`/community/${community?.community?._id}`}
                className="relative bg-gray-800 p-4 rounded-lg shadow transition-all duration-300 group hover:shadow-xl hover:scale-105 hover:border-2 hover:border-blue-500"
              >
                <div className="absolute inset-0 border-2 border-transparent rounded-lg group-hover:border-blue-500 transition-all duration-300"></div>
                <img
                  src={
                    community?.community?.community?.imageLink ||
                    "https://res.cloudinary.com/dqtwwvm7p/image/upload/v1746915829/temp-community-image_ebspfe.jpg"
                  }
                  alt={community?.community?.community?.name}
                  className={`w-full h-48 object-cover rounded-lg mb-2 border-2 ${
                    community?.community?.community?.subscription?.plan ===
                    "elite"
                      ? "border-yellow-500"
                      : community?.community?.community?.subscription?.plan ===
                        "premium"
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                />
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  {community?.community?.community?.name}
                  {(community?.community?.community?.subscription?.plan ===
                    "elite" ||
                    community?.community?.community?.subscription?.plan ===
                      "premium" ||
                    community?.community?.community?.subscription?.plan ===
                      "standard") && (
                    <CheckBadgeIcon className="w-5 h-5 text-yellow-400 ml-1" />
                  )}
                </h3>
                <p className="text-gray-400 mb-2">
                  {community?.community?.community?.description}
                </p>
                <p className="text-sm text-gray-500">
                  Members: {community?.community?.community?.membersCount}
                </p>
                <p className="text-green-500 mt-1">
                  {community?.community?.community?.subscription?.plan ===
                    "elite" ||
                  community?.community?.community?.subscription?.plan ===
                    "premium"
                    ? community?.community?.community?.promotionalText || ""
                    : ""}
                </p>
              </Link>
            ))}
          </div>

          {/* Pagination Controls for Your Communities */}
          <div className="flex justify-center items-center mt-4 space-x-4">
            <button
              onClick={handlePrevPageYour}
              disabled={currentPageYour === 1}
              className={`p-2 rounded ${
                currentPageYour === 1
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
            <span>Page {currentPageYour}</span>
            {/* <span>
              Page {currentPageYour} of {totalPagesYour}
            </span> */}
            <button
              onClick={handleNextPageYour}
              //   disabled={currentPageYour === totalPagesYour}
              //   className={`p-2 rounded ${
              //     currentPageYour === totalPagesYour
              //       ? "bg-gray-600 cursor-not-allowed"
              //       : "bg-blue-600 hover:bg-blue-700"
              //   }`}
              className="p-2 rounded bg-blue-600 hover:bg-blue-700"
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
        </section>

        {/* Suggested Communities with Pagination */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Suggested Communities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedSuggestedCommunities.map((community) => (
              <Link
                key={community._id}
                href={`/community/${community._id}`}
                className="relative bg-gray-800 p-4 rounded-lg shadow transition-all duration-300 group hover:shadow-xl hover:scale-105 hover:border-2 hover:border-blue-500"
              >
                <div className="absolute inset-0 border-2 border-transparent rounded-lg group-hover:border-blue-500 transition-all duration-300"></div>
                <img
                  src={
                    community?.community?.imageLink ||
                    "https://res.cloudinary.com/dqtwwvm7p/image/upload/v1746915829/temp-community-image_ebspfe.jpg"
                  }
                  alt={community?.community?.name}
                  className={`w-full h-48 object-cover rounded-lg mb-2 border-2 ${
                    community?.community?.subscription?.plan === "elite"
                      ? "border-yellow-500"
                      : community?.community?.subscription?.plan === "premium"
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                />
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  {community?.community?.name}
                  {(community?.community?.subscription?.plan === "elite" ||
                    community?.community?.subscription?.plan === "premium" ||
                    community?.community?.subscription?.plan ===
                      "standard") && (
                    <CheckBadgeIcon className="w-5 h-5 text-yellow-400 ml-1" />
                  )}
                </h3>

                <p className="text-gray-400 mb-2">
                  {community?.community?.description}
                </p>
                <p className="text-sm text-gray-500">
                  Members: {community?.community?.membersCount}
                </p>

                <p className="text-green-500 mt-1">
                  {community?.community?.subscription?.plan === "elite" ||
                  community?.community?.subscription?.plan === "premium"
                    ? community?.community?.promotionalText || ""
                    : ""}
                </p>
              </Link>
            ))}
          </div>

          {/* Pagination Controls for Suggested Communities */}
          <div className="flex justify-center items-center mt-4 space-x-4">
            <button
              onClick={handlePrevPageSuggested}
              disabled={currentPageSuggested === 1}
              className={`p-2 rounded ${
                currentPageSuggested === 1
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
            <span>Page {currentPageSuggested}</span>
            {/* <span>
              Page {currentPageSuggested} of {totalPagesSuggested}
            </span> */}
            <button
              onClick={handleNextPageSuggested}
              //   disabled={currentPageSuggested === totalPagesSuggested}
              //   className={`p-2 rounded ${
              //     currentPageSuggested < totalPagesSuggested
              //       ? "bg-gray-600 cursor-not-allowed"
              //       : "bg-blue-600 hover:bg-blue-700"
              //   }`}
              className="p-2 rounded 
                  bg-blue-600 hover:bg-blue-700"
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
