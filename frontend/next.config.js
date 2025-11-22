/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
  },
  // Railway provides PORT environment variable
  // Next.js will use it automatically via process.env.PORT
  env: {
    // VAPID key from environment variable (set in Railway) or fallback to development key
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BEirJUyHHEE0th0-6V0T8vQAlOGiyOTFXvt38xzgZW8XtABz7VloUCYNvJQ77oE3ZBqXbs3WqIK_u41bTfBIxQQ',
    // API Base URLs - override via .env (or Railway variables)
    NEXT_PUBLIC_NOTIFICATION_API_URL: process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:5001',
    NEXT_PUBLIC_ACCOUNT_DATA_API_URL: process.env.NEXT_PUBLIC_ACCOUNT_DATA_API_URL || 'http://localhost:8000',
  },
  // Prevent compilation hangs
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't block on service worker registration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  // Optimize compilation
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
