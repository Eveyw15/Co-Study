/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We keep the original project approach (Tailwind via CDN script).
  // If you later want a production Tailwind build, we can migrate to PostCSS.
};

module.exports = nextConfig;
