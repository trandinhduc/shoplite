import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/app/**/page.tsx", "src/app/**/layout.tsx"],
      // Sàn coverage của gate unit (Module 7): thấp hơn số đo trên main khoảng 10 điểm,
      // để chặn tụt mạnh mà không đỏ vì dao động nhỏ. Không nói được tính năng mới có test hay không.
      thresholds: { lines: 60, statements: 60, functions: 60, branches: 55 },
    },
  },
});
