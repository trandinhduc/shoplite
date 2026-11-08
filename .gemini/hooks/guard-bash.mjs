#!/usr/bin/env node
// Hook: PreToolUse (matcher: Bash)
// Chặn các lệnh nguy hiểm bằng JSON output (thay vì exit code 2) để minh họa cách
// trả quyết định có cấu trúc: permissionDecision = "deny" | "ask" | "allow".

const RULES = [
  {
    pattern: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i,
    decision: "deny",
    reason: "Không dùng rm -rf. Hãy xóa từng file cụ thể.",
  },
  {
    pattern: /\bgit\s+push\b.*(--force|-f\b)/,
    decision: "deny",
    reason: "Không force push - có thể làm mất commit của người khác.",
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    decision: "deny",
    reason: "git reset --hard làm mất thay đổi chưa commit.",
  },
  {
    pattern: /--no-verify\b/,
    decision: "deny",
    reason: "Không được bỏ qua git hooks (--no-verify).",
  },
  {
    pattern: /\bnpm\s+publish\b/,
    decision: "deny",
    reason: "Dự án private, không publish lên npm.",
  },
  {
    pattern: /\bgit\s+checkout\s+--\s|\bgit\s+restore\b/,
    decision: "ask",
    reason: "Lệnh này hủy thay đổi trong file - cần người dùng xác nhận.",
  },
];

const input = JSON.parse(await readStdin());
const command = input.tool_input?.command ?? "";

const matched = RULES.find((rule) => rule.pattern.test(command));
if (matched) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: matched.decision,
        permissionDecisionReason: `🛡️ guard-bash: ${matched.reason}`,
      },
    }),
  );
}

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
