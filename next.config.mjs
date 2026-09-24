/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.124.244.197"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.ngrok-free.app",
        "*.ngrok.io",
        "*.loca.lt"
      ],
    },
  },
};

export default nextConfig;
