'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      <Navbar />
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://zos.alipayobjects.com/rmsportal/hzPBTkqtFpLlWCi.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-8 md:p-12 border border-gray-700 shadow-2xl">
            {/* 404 Icon/Number */}
            <div className="mb-6">
              <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">
                404
              </h1>
            </div>

            {/* Error Message */}
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Sorry, we couldn&apos;t find the page you&apos;re looking for.
            </p>
            <p className="text-gray-400 mb-8">
              The page might have been moved, deleted, or doesn&apos;t exist.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                <i className="fa fa-home mr-2"></i>
                Return to Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
              >
                <i className="fa fa-arrow-left mr-2"></i>
                Go Back
              </button>
            </div>

            {/* Additional Links */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-4">You might be looking for:</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/communities" className="text-blue-400 hover:text-blue-300 transition-colors">
                  <i className="fa fa-users mr-1"></i>
                  Communities
                </Link>
                <Link href="/about-us" className="text-blue-400 hover:text-blue-300 transition-colors">
                  <i className="fa fa-info-circle mr-1"></i>
                  About Us
                </Link>
                <Link href="/contact-us" className="text-blue-400 hover:text-blue-300 transition-colors">
                  <i className="fa fa-envelope mr-1"></i>
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

