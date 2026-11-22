import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    ".next-manual/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output of tests and local storage
    "coverage/**",
    "storage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  // Luật của nhóm: mã trong thông báo trùng mã mục trong .github/review-checklist.md.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='RegExp'][arguments.0.type!='Literal']",
          message:
            "[BM-1] Không dựng RegExp từ dữ liệu động (có thể là dữ liệu khách), kể cả khi comment nói đã kiểm. Dùng includes trên chuỗi đã normalizeText.",
        },
        {
          selector: "CallExpression[callee.name='RegExp'][arguments.0.type!='Literal']",
          message:
            "[BM-1] Không dựng RegExp từ dữ liệu động (có thể là dữ liệu khách), kể cả khi comment nói đã kiểm. Dùng includes trên chuỗi đã normalizeText.",
        },
        { selector: "CallExpression[callee.name='eval']", message: "[BM-2] Không dùng eval." },
        {
          selector: "NewExpression[callee.name='Function']",
          message: "[BM-2] Không dùng new Function.",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "[BM-2] Không dùng dangerouslySetInnerHTML.",
        },
      ],
    },
  },
  // KT-1: file giao diện/client không import module chỉ-server (bắc cầu do client-boundary.test.ts giữ).
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/features/**/components/**/*.{ts,tsx}",
      "src/features/**/use-*.{ts,tsx}",
      "src/features/**/*-store.{ts,tsx}",
    ],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/orders/server",
                "@/features/inventory/server",
                "@/features/admin/admin-guard",
                "@/features/coupons/coupon-service",
                "@/features/orders/order-service",
                "@/data/products",
                "@/data/coupons",
                "node:*",
              ],
              allowTypeImports: true,
              message:
                "[KT-1] Client Component không được import module chỉ-server (kể cả gián tiếp).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
