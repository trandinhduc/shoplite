import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // FR-020: không để danh sách mã giảm giá lọt vào code chạy ở trình duyệt.
    // Component (*.tsx) và hook chạy ở trình duyệt (use-*.ts).
    files: ["src/**/*.tsx", "src/**/use-*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)data/coupons$",
              message:
                "Không import dữ liệu/dịch vụ mã giảm giá vào component (FR-020). Dùng coupon-rules.ts.",
            },
            {
              regex: "(^|/)coupons/coupon-service$",
              message:
                "Không import dữ liệu/dịch vụ mã giảm giá vào component (FR-020). Dùng coupon-rules.ts.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output of tests and local storage
    "coverage/**",
    "storage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
