/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "v0.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    unoptimized: process.env.NODE_ENV === "development",
    minimumCacheTTL: 60,
  },
  experimental: {
    // Remove optimizeCss to fix the critters module error
    scrollRestoration: true,
  },
  // Ensure we're using the Flask backend
  async rewrites() {
    return [
      {
        source: "/api/wishlist/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/wishlist/:path*`,
      },
      // Keep any existing rewrites below
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/:path*`,
      },
      {
        source: "/api/mizizzi_admin/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/:path*`,
      },
    ]
  },

  // Update the headers function to be simpler and avoid setting duplicate headers
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Access-Control-Allow-Credentials", value: "true" }],
      },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable cache in development to prevent these errors
      config.cache = false
    }
    return config
  },
}

export default nextConfig
