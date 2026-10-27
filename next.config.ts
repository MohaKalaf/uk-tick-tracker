import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// cacheComponents stays off: on Cloudflare Workers its staged rendering hangs
// requests (opennextjs/opennextjs-cloudflare#1318).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Gives `next dev` local D1 and KV, so the app runs without a Cloudflare account
initOpenNextCloudflareForDev();

export default nextConfig;
