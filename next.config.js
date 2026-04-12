/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'gsbwfojhvjspujtzdsvf.supabase.co' }
    ],
  },
  turbopack: {},
  // Optional: silence turbopack root warning if it persists
  experimental: {
    // Other experimental features can go here
  }
}

module.exports = withPWA(nextConfig)
