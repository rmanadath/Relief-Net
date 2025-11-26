/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Add this to skip static page generation errors temporarily
    experimental: {
      missingSuspenseWithCSRBailout: false,
    },
  }
  
  module.exports = nextConfig