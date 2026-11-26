import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.116"],
  async redirects() {
    return [
      ...[
        "bilad-portal-web.vercel.app",
        "bilad-portal-web-biladegitim-9559s-projects.vercel.app",
        "bilad-portal-web-git-main-biladegitim-9559s-projects.vercel.app",
      ].map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host.replaceAll(".", "\\.") }],
        destination: "https://portal.bilad.org.tr/:path*",
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
