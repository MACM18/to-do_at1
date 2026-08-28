import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'node-cron', 'nodemailer'],
};

export default nextConfig;
