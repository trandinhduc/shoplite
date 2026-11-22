import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Không để `next dev` tự tạo/sửa AGENTS.md - giữ repo đúng như mã nguồn gốc.
  agentRules: false,
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
