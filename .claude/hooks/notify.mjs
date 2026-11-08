#!/usr/bin/env node
// Hook: Notification (tùy chọn)
// Hiện thông báo trên desktop khi Claude Code cần bạn (xin quyền, chờ nhập liệu...).
// Nội dung được truyền qua tham số/biến môi trường (không ghép chuỗi lệnh) nên giữ nguyên
// mọi ký tự đặc biệt như " ' ` $ \ mà không cần lọc bỏ.

import { execFile } from "node:child_process";
import path from "node:path";

/** Nhãn tiếng Việt cho từng loại thông báo của Claude Code. */
const TYPE_LABELS = {
  permission_prompt: "Cần cấp quyền",
  idle_prompt: "Đang chờ bạn nhập",
  auth_success: "Xác thực thành công",
  elicitation_dialog: "Cần bạn trả lời",
};

const input = parseJson(await readStdin());
const message = String(input.message ?? "Claude Code cần bạn xác nhận").trim();
const project = path.basename(
  input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
);
const title = `Claude Code - ${project}`;
const subtitle = TYPE_LABELS[input.notification_type] ?? input.title ?? "";

if (process.platform === "darwin") {
  // Dùng `on run argv` để AppleScript nhận chuỗi nguyên vẹn, không cần escape.
  const script = [
    "on run argv",
    '  display notification (item 1 of argv) with title (item 2 of argv) subtitle (item 3 of argv) sound name "Glass"',
    "end run",
  ].join("\n");
  run("osascript", ["-e", script, message, title, subtitle]);
} else if (process.platform === "win32") {
  // Truyền qua biến môi trường để PowerShell không diễn giải ký tự đặc biệt.
  run(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Add-Type -AssemblyName System.Windows.Forms; " +
        "$body = if ($env:NOTIFY_SUBTITLE) { $env:NOTIFY_SUBTITLE + [Environment]::NewLine + $env:NOTIFY_MESSAGE } else { $env:NOTIFY_MESSAGE }; " +
        "[System.Windows.Forms.MessageBox]::Show($body, $env:NOTIFY_TITLE) | Out-Null",
    ],
    { NOTIFY_MESSAGE: message, NOTIFY_TITLE: title, NOTIFY_SUBTITLE: subtitle },
  );
} else {
  run("notify-send", [title, subtitle ? `${subtitle}\n${message}` : message]);
}

/** Chạy lệnh hiển thị; lỗi chỉ ghi ra stderr để không làm gián đoạn Claude Code. */
function run(cmd, args, env) {
  execFile(cmd, args, { env: { ...process.env, ...env } }, (error) => {
    if (error)
      console.error(`notify: không hiện được thông báo (${error.message})`);
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
