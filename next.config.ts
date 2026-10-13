import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs s'appuie sur les flux Node : chargé tel quel plutôt que bundlé
  serverExternalPackages: ["exceljs"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
