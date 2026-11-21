#!/usr/bin/env node
// Hook: PostToolUse (matcher: Edit|Write)
// Tự động chạy Prettier cho file vừa được agent sửa -> code luôn đúng format của dự án
// mà không tốn lượt nhắc agent "nhớ format code".

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const FORMATTABLE = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".json", ".md"]);

const input = JSON.parse(await readStdin());
const filePath = input.tool_input?.file_path;
if (!filePath || !FORMATTABLE.has(path.extname(filePath)) || !existsSync(filePath)) {
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const prettier = path.join(projectDir, "node_modules", "prettier", "bin", "prettier.cjs");
if (!existsSync(prettier)) process.exit(0); // chưa npm install -> bỏ qua, không chặn agent

try {
  // Dùng chính Node đang chạy hook để gọi Prettier -> chạy được trên cả Windows/macOS/Linux
  execFileSync(process.execPath, [prettier, "--write", "--log-level", "warn", filePath], {
    cwd: projectDir,
    stdio: ["ignore", "ignore", "pipe"],
  });
} catch (error) {
  // File có lỗi cú pháp -> báo cho agent biết (PostToolUse: exit 2 = gửi stderr cho agent)
  console.error(`Prettier không format được ${filePath}:\n${error.stderr ?? error.message}`);
  process.exit(2);
}

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
