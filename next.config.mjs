/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic modules from webpack bundling
      config.externals = [...(config.externals || []), 'canvas', 'pdfjs-dist']
    }
    return config
  },
}

export default nextConfig
