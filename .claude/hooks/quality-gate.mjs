#!/usr/bin/env node
// Hook: Stop (nâng cao)
// Khi agent định kết thúc lượt làm việc: nếu có file trong src/ thay đổi thì chạy unit test.
// Test fail -> trả về decision "block" để buộc agent sửa tiếp thay vì báo "xong".

import { execSync } from "node:child_process";

const input = JSON.parse(await readStdin());

// Đã bị chặn một lần và agent đang sửa tiếp -> không chặn lặp vô hạn
if (input.stop_hook_active) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const run = (command) =>
  execSync(command, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });

let changed = "";
try {
  changed = run("git status --porcelain -- src");
} catch {
  process.exit(0); // không phải git repo -> bỏ qua
}
if (!changed.trim()) process.exit(0); // chỉ hỏi đáp, không sửa code -> không cần chạy test

try {
  run("npm test --silent");
} catch (error) {
  // Chỉ giữ tên các test fail + dòng tổng kết, bỏ phần dump DOM dài dòng
  const output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    .split("\n")
    .filter((line) => /FAIL|AssertionError|Error:|Test Files|Tests /.test(line))
    .slice(0, 30)
    .join("\n");
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `Quality gate: unit test đang FAIL sau khi bạn sửa code. Hãy sửa cho pass rồi mới kết thúc.\n${output}`,
    }),
  );
}

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
