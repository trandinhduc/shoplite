#!/usr/bin/env node
// Hook: UserPromptSubmit
// 1) Chặn prompt có chứa thứ trông giống secret (API key, token, mật khẩu) trước khi gửi cho model.
// 2) Với prompt hợp lệ: bổ sung ngữ cảnh (nhánh git hiện tại) vào cuộc hội thoại.

import { execSync } from "node:child_process";

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/, // OpenAI / Anthropic style key
  /ghp_[A-Za-z0-9]{30,}/, // GitHub token
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /(password|mat_?khau|secret)\s*[:=]\s*\S{6,}/i,
];

const input = JSON.parse(await readStdin());
const prompt = input.prompt ?? "";

if (SECRET_PATTERNS.some((pattern) => pattern.test(prompt))) {
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        "🔐 scan-prompt: prompt có vẻ chứa secret (API key/token/mật khẩu). " +
        "Hãy xóa secret và dùng biến môi trường thay thế.",
    }),
  );
  process.exit(0);
}

let branch = "unknown";
try {
  branch = execSync("git branch --show-current", {
    cwd: process.env.CLAUDE_PROJECT_DIR ?? input.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  // không phải git repo
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `Nhánh git hiện tại: ${branch}. Nhớ chạy "npm run check" trước khi báo hoàn thành.`,
    },
  }),
);

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
