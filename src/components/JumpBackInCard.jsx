"use client";

import React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function JumpBackInCard({
  communityName,
  lastAccessed,
  image = "https://res.cloudinary.com/dqtwwvm7p/image/upload/v1746915829/temp-community-image_ebspfe.jpg",
  initials = "TG",
  href = "#",
}) {
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 to-blue-500 text-white p-4 rounded-xl shadow-md w-full max-w-md">
      <div className="flex items-center space-x-4">
        {/* Circle Image */}
        <img
          src={
            image ||
            "https://res.cloudinary.com/dqtwwvm7p/image/upload/v1746915829/temp-community-image_ebspfe.jpg"
          }
          alt="Community Image"
          className="w-12 h-12 rounded-full"
        />
        {/* <div 
          className="flex items-center justify-center w-12 h-12 rounded-full"
        />
        {/* {initials}
        </div> */}

        {/* Text Info */}
        <div className="flex flex-col">
          <span className="font-semibold text-base">{communityName}</span>
          <span className="text-green-400 text-sm flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Last Accessed {lastAccessed}
          </span>
        </div>
      </div>

      {/* Go Button */}
      <Link
        href={href}
        className="flex items-center bg-blue-950 hover:bg-blue-800 px-4 py-2 rounded-full transition"
      >
        <span className="text-white font-semibold mr-1">Go</span>
        <ArrowRightIcon className="w-4 h-4 text-white" />
      </Link>
    </div>
  );
}
