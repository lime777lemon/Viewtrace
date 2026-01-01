/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow webhook routes to handle raw body
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

module.exports = nextConfig

