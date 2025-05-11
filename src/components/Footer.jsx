import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6 text-sm">
        {/* Company Info */}
        <div>
          <h3 className="font-bold text-blue-400 mb-2">Lines Police CAD</h3>

          <p>TLPS LLC</p>
          <p>Phoenix, AZ 85213</p>
        </div>

        {/* Popular Games */}
        <div>
          <h3 className="font-bold mb-2">Popular Communities</h3>
          <ul className="space-y-1">
            <li>
              <a href="#" className="text-blue-400 hover:underline">
                Community 1
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-400 hover:underline">
                Community 2 [PC]
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-400 hover:underline">
                Community 3
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-400 hover:underline">
                Community 4 [PC]
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-400 hover:underline">
                Community 5
              </a>
            </li>
          </ul>
        </div>

        {/* Account */}
        <div>
          <h3 className="font-bold mb-2">Account</h3>
          <ul className="space-y-1">
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
                Register
              </a>
            </li>
          </ul>
        </div>

        {/* GPORTAL Services */}
        <div>
          <h3 className="font-bold mb-2">Lines Police CAD</h3>
          <ul className="space-y-1">
            <li>
              <a href="/game-studios" className="text-blue-400 hover:underline">
                Game Studios
              </a>
            </li>
            <li>
              <a
                href="/content-creators"
                className="text-blue-400 hover:underline"
              >
                Content Creators
              </a>
            </li>
            <li>
              <a
                href="/sustainability"
                className="text-blue-400 hover:underline"
              >
                Sustainability
              </a>
            </li>
            <li>
              <a href="/status" className="text-blue-400 hover:underline">
                Status
              </a>
            </li>
            <li>
              <a href="/jobs" className="text-blue-400 hover:underline">
                Jobs
              </a>
            </li>
            <li>
              <a href="/wiki" className="text-blue-400 hover:underline">
                Wiki
              </a>
            </li>
            <li>
              <a href="/forum" className="text-blue-400 hover:underline">
                Forum
              </a>
            </li>
            <li>
              <a href="/terms" className="text-blue-400 hover:underline">
                Terms
              </a>
            </li>
            <li>
              <a href="/privacy" className="text-blue-400 hover:underline">
                Privacy
              </a>
            </li>
            <li>
              <a href="/imprint" className="text-blue-400 hover:underline">
                Imprint
              </a>
            </li>
          </ul>
        </div>

        {/* Language & Currency */}
        <div className="text-right md:text-left">
          <h3 className="font-bold mb-2">Language & Currency</h3>
          <a
            href="#"
            className="text-blue-400 hover:underline flex items-center justify-end md:justify-start"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            English / USD
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 border-t border-gray-700 pt-4 flex flex-col md:flex-row justify-between items-center text-xs">
        {/* Support */}
        <div>
          <h3 className="font-bold mb-1">Support</h3>
          <a href="/support" className="text-blue-400 hover:underline">
            Ticket System
          </a>
        </div>

        {/* Follow Us */}
        <div className="flex space-x-4 my-2 md:my-0">
          <a href="#" className="hover:text-blue-400">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.436c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.49 0-1.955.925-1.955 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" />
            </svg>
          </a>
          <a href="#" className="hover:text-blue-400">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.618 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.919-.058-1.265-.069-1.589-.069-4.849 0-3.205.012-3.584.069-4.849.149-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441-.645-1.441-1.44s.645-1.44 1.441-1.44c.795 0 1.439.645 1.439 1.44s-.644 1.44-1.439 1.44z" />
            </svg>
          </a>
          <a href="#" className="hover:text-blue-400">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a href="#" className="hover:text-blue-400">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.068 14.583c-.23 0-.415-.185-.415-.415v-4.742c0-.23.185-.415.415-.415h.831c.23 0 .415.185.415.415v4.742c0 .23-.185.415-.415.415h-.831zm-4.292 0c-.23 0-.415-.185-.415-.415v-7.917c0-.23.185-.415.415-.415h.831c.23 0 .415.185.415.415v7.917c0 .23-.185.415-.415.415h-.831zm-4.292 0c-.23 0-.415-.185-.415-.415v-5.833c0-.23.185-.415.415-.415h.831c.23 0 .415.185.415.415v5.833c0 .23-.185.415-.415.415h-.831z" />
            </svg>
          </a>
        </div>

        {/* Payment Options */}
        {/* <div className="flex space-x-2">
          <img
            src="https://via.placeholder.com/40x20?text=SOFORT"
            alt="SOFORT"
            className="h-5"
          />
          <img
            src="https://via.placeholder.com/40x20?text=PaySafe"
            alt="PaySafe"
            className="h-5"
          />
          <img
            src="https://via.placeholder.com/40x20?text=PayPal"
            alt="PayPal"
            className="h-5"
          />
          <img
            src="https://via.placeholder.com/40x20?text=Visa"
            alt="Visa"
            className="h-5"
          />
          <img
            src="https://via.placeholder.com/40x20?text=MasterCard"
            alt="MasterCard"
            className="h-5"
          />
        </div> */}
      </div>

      <div className="max-w-7xl mx-auto mt-4 text-xs text-gray-400 text-center">
        <p>
          The logos and brandmarks displayed on the Website may be trademarked
          by their respective owners. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
