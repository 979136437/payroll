import os from "node:os";

import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

function getLocalIPv4s(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const addrs of Object.values(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      // 新版 Node 用字符串 "IPv4"，旧版用数字 4，两者都兼容
      const isIPv4 = addr.family === "IPv4" || (addr.family as unknown) === 4;
      if (isIPv4 && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}


const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  output: "standalone",
  experimental: {
    optimizeCss: true,
  },
  allowedDevOrigins: isProd ? undefined : getLocalIPv4s(),
};

export default nextConfig;
