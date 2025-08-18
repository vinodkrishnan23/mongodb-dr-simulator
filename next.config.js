/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is now stable in Next.js 15
  output: 'standalone',
  
  // Optimize for production
  poweredByHeader: false,
  
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    unoptimized: true, // Since we're not using next/image, disable optimization
  },
}

module.exports = nextConfig
