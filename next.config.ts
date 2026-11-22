import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Không để `next dev` tự tạo/sửa AGENTS.md - giữ repo đúng như mã nguồn gốc.
  agentRules: false,
  // Mặc định 'security': dưới AI agent, `next dev` đầu tiên thoát (exit 1) để nhắc nâng cấp nên Playwright
  // không dựng được server và E2E đỏ ngẫu nhiên (ECONNREFUSED). Nâng cấp Next làm riêng, không qua nudge này.
  experimental: { agentUpgrade: false },
  // Chỉ E2E đặt biến này để chạy server thứ hai song song; mặc định vẫn là `.next`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Docker: sinh `.next/standalone` (server tối giản) để image chạy bằng `node server.js`.
  output: "standalone",
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
