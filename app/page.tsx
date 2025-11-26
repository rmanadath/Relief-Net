"use client";

import Link from "next/link";
import Navigation from "../src/components/Navigation";

// Import the shared component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      PostRequestForm: any;
    }
  }
}

// Dynamic import to avoid SSR issues
const PostRequestForm = require("../src/components/PostRequestForm").default;

export default function Home() {
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8">
            Providing the world a{" "}
            <span className="text-indigo-600">safety net</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            A disaster relief web platform designed to connect people in need with volunteers who can offer help. 
            Making disaster relief faster, fairer, and more efficient.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="#post-form"
              className="bg-indigo-600 text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Post Request
            </Link>
            <Link
              href="/login"
              className="bg-white text-indigo-600 px-10 py-4 rounded-lg font-semibold text-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Post Requests</h3>
            <p className="text-gray-600 text-lg">
              Easily post urgent aid requests for food, medicine, shelter, and other essential needs.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Real-time Updates</h3>
            <p className="text-gray-600 text-lg">
              Get real-time updates on your requests and see new opportunities to help others.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Secure & Reliable</h3>
            <p className="text-gray-600 text-lg">
              Your data is secure and your requests are handled with care and efficiency.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white rounded-lg shadow-md p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">100+</div>
              <div className="text-gray-600">Requests Posted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">50+</div>
              <div className="text-gray-600">Active Volunteers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">25+</div>
              <div className="text-gray-600">Cities Covered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">95%</div>
              <div className="text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Post Request Form Section */}
        <div id="post-form" className="mt-20 bg-white rounded-lg shadow-lg p-12">
          <PostRequestForm variant="page" />
        </div>

        {/* Volunteer Info Section */}
        <div id="volunteer-info" className="mt-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-12 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Become a Volunteer</h2>
            <p className="text-xl mb-8 text-indigo-100">
              Help make a difference in your community by volunteering to deliver aid to those in need.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-2xl font-bold mb-2">1️⃣</div>
                <h3 className="font-semibold mb-2">Sign Up</h3>
                <p className="text-sm text-indigo-100">Create an account and log in to access the volunteer dashboard</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-2xl font-bold mb-2">2️⃣</div>
                <h3 className="font-semibold mb-2">Get Verified</h3>
                <p className="text-sm text-indigo-100">Contact an admin to set your role to "volunteer"</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-2xl font-bold mb-2">3️⃣</div>
                <h3 className="font-semibold mb-2">Start Helping</h3>
                <p className="text-sm text-indigo-100">Use the Route Optimizer to find nearby requests and optimize your delivery routes</p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-left">
              <h3 className="font-semibold mb-3">Volunteer Features:</h3>
              <ul className="space-y-2 text-indigo-100">
                <li>✅ Find nearby aid requests in your area</li>
                <li>✅ Optimize delivery routes for multiple requests</li>
                <li>✅ Track your volunteer activities</li>
                <li>✅ Provide feedback on completed deliveries</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-4xl font-bold text-indigo-400 mb-6">Relief-Net</h3>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Connecting people in need with volunteers who can help during crisis situations. 
              Making disaster relief faster, fairer, and more efficient.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/post-request"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold border-2 border-white hover:bg-gray-100 transition-colors"
              >
                Post Request
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Relief-Net. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}