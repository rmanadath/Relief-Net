'use client'

import Link from 'next/link'
import { useAuth } from '../AuthContext'

export default function Navigation() {
  const { user, signOut } = useAuth()

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              Relief-Net
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-indigo-600 font-medium">
              Home
            </Link>
            {user ? (
              <>
                <Link href="/login" className="text-gray-700 hover:text-indigo-600 font-medium">
                  Dashboard
                </Link>
                <button 
                  onClick={signOut}
                  className="text-gray-700 hover:text-indigo-600 font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-indigo-600 font-medium">
                  Login
                </Link>
                <Link href="/post-request" className="text-gray-700 hover:text-indigo-600 font-medium">
                  Post Request
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}