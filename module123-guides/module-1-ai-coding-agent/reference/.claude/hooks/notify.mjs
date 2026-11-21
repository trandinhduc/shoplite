#!/usr/bin/env node
// Hook: Notification (tùy chọn)
// Hiện thông báo trên desktop khi Claude Code cần bạn (xin quyền, chờ nhập liệu...).

import { execFile } from "node:child_process";

const input = JSON.parse(await readStdin());
const message = (input.message ?? "Claude Code cần bạn xác nhận").replace(/["'`$\\]/g, "");
const title = "Claude Code - ShopLite";

if (process.platform === "darwin") {
  execFile("osascript", ["-e", `display notification "${message}" with title "${title}"`]);
} else if (process.platform === "win32") {
  execFile("powershell", [
    "-NoProfile",
    "-Command",
    `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; ` +
      `[System.Windows.Forms.MessageBox]::Show('${message}', '${title}')`,
  ]);
} else {
  execFile("notify-send", [title, message]);
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
