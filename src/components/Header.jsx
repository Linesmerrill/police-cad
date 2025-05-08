"use client";
import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Lines Police CAD
        </Link>

        <nav className="hidden md:flex space-x-6">
          <Link
            href="/auth/login"
            className="text-gray-700 hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="text-gray-700 hover:text-blue-600"
          >
            Sign Up
          </Link>
          <Link href="/contact" className="text-gray-700 hover:text-blue-600">
            Contact
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            className="h-6 w-6 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t px-6 pb-4">
          <Link
            href="/auth/login"
            className="block py-2 text-gray-700 hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="block py-2 text-gray-700 hover:text-blue-600"
          >
            Sign Up
          </Link>
          <Link
            href="/contact"
            className="block py-2 text-gray-700 hover:text-blue-600"
          >
            Contact
          </Link>
        </div>
      )}
    </header>
  );
}
