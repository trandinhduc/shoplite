#!/usr/bin/env node
// PreToolUse (matcher: Edit|Write) - chặn sửa file nhạy cảm bằng exit code 2
import path from "node:path";

const PROTECTED = [
  { pattern: /(^|\/)\.env(\..*)?$/, reason: "file biến môi trường có thể chứa bí mật" },
  { pattern: /(^|\/)package-lock\.json$/, reason: "chỉ được thay đổi qua lệnh npm install" },
  { pattern: /^storage\//, reason: "dữ liệu đơn hàng thật, không sửa bằng tay" },
  { pattern: /^\.git\//, reason: "không được sửa nội bộ git" },
];

const input = JSON.parse(await readStdin());
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = process.env.GEMINI_PROJECT_DIR ?? input.cwd;
const relativePath = path.relative(projectDir, filePath).split(path.sep).join("/");

for (const { pattern, reason } of PROTECTED) {
  if (pattern.test(relativePath)) {
    console.error(`⛔ Hook protect-files: không được sửa "${relativePath}" (${reason}).`);
    process.exit(2); // 2 = CHẶN, stderr được gửi cho agent
  }
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
