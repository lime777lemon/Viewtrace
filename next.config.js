/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Site URL configuration
  env: {
    SITE_URL: process.env.SITE_URL || 'https://viewtrace.net',
  },
}

module.exports = nextConfig
