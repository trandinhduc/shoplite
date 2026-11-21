#!/usr/bin/env node
// Hook: PreToolUse (matcher: Edit|Write)
// Chặn agent sửa các file nhạy cảm. Cách chặn: in lý do ra stderr và thoát với exit code 2
// -> Claude Code hủy thao tác và gửi lý do cho agent để nó đổi cách làm.

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

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const relativePath = path.relative(projectDir, filePath).split(path.sep).join("/");

for (const { pattern, reason } of PROTECTED) {
  if (pattern.test(relativePath)) {
    console.error(
      `⛔ Hook protect-files: không được sửa "${relativePath}" (${reason}). ` +
        `Hãy dừng lại và hỏi người dùng nếu thật sự cần thay đổi file này.`,
    );
    process.exit(2);
  }
}

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
