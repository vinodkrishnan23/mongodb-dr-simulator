/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simple configuration for the MongoDB DR Simulator
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
