import Footer from "@/components/Footer";
import React from "react";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">
              Lines Police CAD
            </h1>
            <nav>
              <a
                href="/auth/login"
                className="text-sm text-blue-600 hover:underline mr-4"
              >
                Login
              </a>
              <a
                href="/auth/register"
                className="text-sm text-white bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Sign Up
              </a>
            </nav>
          </div>
        </header>

        <section className="py-20 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Welcome to Lines Police CAD
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              The ultimate free platform to create, discover, and manage
              roleplay communities. Whether you're a civilian or an officer,
              start building connections today.
            </p>
            <a
              href="/auth/register"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700"
            >
              Get Started Free
            </a>
          </div>
        </section>

        <section className="relative py-16 bg-white overflow-hidden">
          {/* Background shape/image */}
          <div className="absolute inset-0 -z-10">
            <img
              src="/abstract1.png"
              alt="abstract background"
              className="w-full h-full object-cover opacity-20 blur-sm"
            />
          </div>

          <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold mb-4">Key Features</h3>
              <ul className="space-y-4 text-gray-700 list-disc pl-5">
                <li>
                  <strong>Create and Join Communities:</strong> Free and
                  subscription-based tiers.
                </li>
                <li>
                  <strong>Promotion Tiers:</strong> Boost your community’s
                  visibility with Home Page placements.
                </li>
                <li>
                  <strong>Personalized Experience:</strong> Verified badges,
                  custom departments, and more.
                </li>
                <li>
                  <strong>Discover and Connect:</strong> Browse active
                  communities and find your people.
                </li>
                <li>
                  <strong>Flexible Subscriptions:</strong> Monthly or annual
                  billing — cancel anytime.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">Why Choose Us?</h3>
              <p className="text-gray-700 mb-4">
                Lines Police CAD is more than just a CAD system — it’s a
                community builder.
              </p>
              <ul className="space-y-4 text-gray-700 list-disc pl-5">
                <li>Safe, organized space for roleplay.</li>
                <li>Tailored plans for users and community admins.</li>
                <li>Tools to grow, connect, and thrive.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 bg-blue-600 text-white text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h3 className="text-3xl font-bold mb-4">
              Download Lines Police CAD Today
            </h3>
            <p className="mb-6">
              Start building your community empire — connect, promote, and
              thrive!
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
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
