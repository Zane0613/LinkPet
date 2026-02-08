/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Optional: Change links /me -> /me/ and emit /me.html -> /me/index.html
  trailingSlash: true,
  // Optional: Prevent automatic image optimization as it requires default Next.js server
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
