/** @type {import('next').NextConfig} */
const nextConfig = {
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
