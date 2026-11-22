import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Luật bảo mật và kiến trúc của nhóm (Module 7): biến quyết định thành kiểm tra máy làm được.
  // Mã luật [BM-x], [KT-x] trùng với mã mục trong .github/review-checklist.md.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='RegExp'][arguments.0.type!='Literal']",
          message:
            "[BM-1] Không dựng RegExp từ dữ liệu bên ngoài: ký tự như ( làm server lỗi 500, mẫu như (.*.*)*! làm server treo (ReDoS). Dùng includes() trên normalizeText().",
        },
        {
          selector: "CallExpression[callee.name='RegExp'][arguments.0.type!='Literal']",
          message:
            "[BM-1] Không dựng RegExp từ dữ liệu bên ngoài. Dùng includes() trên normalizeText().",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "[BM-2] Không chèn HTML thô vào trang (XSS). Hiển thị dạng chữ, React tự escape.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/features/orders/order-repository.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "node:fs",
              message: "[KT-1] Chỉ order-repository.ts được đọc/ghi file. Đi qua OrderRepository.",
            },
            {
              name: "fs",
              message: "[KT-1] Chỉ order-repository.ts được đọc/ghi file. Đi qua OrderRepository.",
            },
            {
              name: "node:fs/promises",
              message: "[KT-1] Chỉ order-repository.ts được đọc/ghi file.",
            },
            { name: "fs/promises", message: "[KT-1] Chỉ order-repository.ts được đọc/ghi file." },
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
