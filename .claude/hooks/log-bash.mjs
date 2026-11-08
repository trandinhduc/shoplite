#!/usr/bin/env node
// Hook: PostToolUse (matcher: Bash)
// Ghi lại mọi lệnh Bash mà agent đã chạy vào .claude/logs/bash-history.log
// Mục đích: "hello world" của hook - xem dữ liệu Claude Code gửi vào hook qua stdin.

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(await readStdin());
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const logDir = path.join(projectDir, ".claude", "logs");

mkdirSync(logDir, { recursive: true });
appendFileSync(
  path.join(logDir, "bash-history.log"),
  `${new Date().toISOString()}\t${input.tool_input?.command}\n`,
);
// Ghi toàn bộ payload (dạng JSON Lines) để sinh viên xem cấu trúc dữ liệu
appendFileSync(path.join(logDir, "hook-payloads.jsonl"), JSON.stringify(input) + "\n");

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
