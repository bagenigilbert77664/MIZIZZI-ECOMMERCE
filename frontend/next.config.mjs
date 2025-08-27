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
    // Add image optimization settings to prevent aspect ratio warnings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp"],
  },
  experimental: {
    // Remove optimizeCss to fix the critters module error
    scrollRestoration: true,
  },
  // Ensure we're using the Flask backend
  async rewrites() {
    return [
      // Image serving routes - these should come first
      {
        source: "/api/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/uploads/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/uploads/:path*`,
      },
      // Product image endpoints
      {
        source: "/api/products/:id/images",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/products/:id/images`,
      },
      {
        source: "/api/product-images/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/product-images/:path*`,
      },
      // Wishlist routes
      {
        source: "/api/wishlist/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/wishlist/:path*`,
      },
      // General API routes (should be last)
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
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === "development" ? "*" : "your-production-domain.com",
          }, // Conditionally set origin
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
        ],
      },
    ]
  },

  // Add proper redirects to handle navigation issues
  async redirects() {
    return [
      {
        source: "/link/react-devtools",
        destination: "https://react.dev/learn/react-developer-tools",
        permanent: true,
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