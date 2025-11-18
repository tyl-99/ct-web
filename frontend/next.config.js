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
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'BEirJUyHHEE0th0-6V0T8vQAlOGiyOTFXvt38xzgZW8XtABz7VloUCYNvJQ77oE3ZBqXbs3WqIK_u41bTfBIxQQ',
  },
}

module.exports = nextConfig
