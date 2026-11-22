#!/usr/bin/env node
// Bốn gate tất định của ShopLite. Máy và CI chạy CÙNG script này:
// xanh ở máy và xanh trên CI nghĩa là một.
//
//   node scripts/ci/gate.mjs lint      # ESLint (có luật BM-1, BM-2, KT-1) + TypeScript
//   node scripts/ci/gate.mjs unit      # Vitest + sàn coverage trong vitest.config.mts
//   node scripts/ci/gate.mjs e2e       # Playwright; test đỏ chạy lại 1 lần, chập chờn vẫn tính là đỏ
//   node scripts/ci/gate.mjs bao-mat   # gitleaks (cả lịch sử commit) + npm audit + soát workflow + quét câu mồi
//   node scripts/ci/gate.mjs all
//
// Mỗi bước ghi gate-<bước>.log (toàn bộ output) và gate-<bước>.json (kết quả từng lệnh).
// Job "phan-tich-loi" trên CI đọc hai file này khi có gate đỏ.

import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, writeFileSync } from "node:fs";

const BUOC = {
  lint: [
    ["ESLint", "npm run lint"],
    ["TypeScript", "npm run typecheck"],
  ],
  unit: [["Vitest + coverage", "npx vitest run --coverage"]],
  e2e: [["Playwright", "npx playwright test --retries=1 --fail-on-flaky-tests"]],
  "bao-mat": [
    // --log-opts=HEAD: quét toàn bộ lịch sử của commit đang kiểm (không quét nhánh khác trên máy).
    ["gitleaks", "gitleaks git --log-opts=HEAD --redact --no-banner --exit-code 1 ."],
    ["npm audit", "npm audit --audit-level=high"],
    ["Soát workflow", "node scripts/ci/kiem-tra-workflow.mjs"],
    ["Quét câu mồi", "node scripts/ci/quet-cau-moi.mjs"],
  ],
};

const tenBuoc = process.argv[2];
if (!tenBuoc || !(tenBuoc in BUOC || tenBuoc === "all")) {
  console.error(`Cách dùng: node scripts/ci/gate.mjs <${Object.keys(BUOC).join("|")}|all>`);
  process.exit(2);
}

const danhSach = tenBuoc === "all" ? Object.keys(BUOC) : [tenBuoc];
const tongKet = [];
for (const buoc of danhSach) tongKet.push(await chayBuoc(buoc));

console.log("\n=== Kết quả gate ===");
for (const { buoc, ketQua } of tongKet)
  console.log(`${ketQua === "do" ? "❌" : "✅"} ${buoc}: ${ketQua}`);
process.exit(tongKet.some((item) => item.ketQua === "do") ? 1 : 0);

async function chayBuoc(buoc) {
  const log = createWriteStream(`gate-${buoc}.log`);
  const lenh = [];
  for (const [ten, command] of BUOC[buoc]) {
    const batDau = Date.now();
    const thieu = thieuGi(command);
    if (thieu?.batBuoc && process.env.CI) {
      // Trên CI không được lặng lẽ bỏ qua một công cụ bảo mật.
      ghi(log, `\n[${ten}] ĐỎ: CI thiếu ${thieu.ten}\n`);
      lenh.push({ ten, command, maThoat: 1, giay: 0 });
      continue;
    }
    if (thieu) {
      ghi(log, `\n[${ten}] ⚠️ BỎ QUA: chưa có ${thieu.ten}\n`);
      lenh.push({ ten, command, maThoat: 0, boQua: true, giay: 0 });
      continue;
    }
    const maThoat = await chay(command, log);
    lenh.push({ ten, command, maThoat, giay: Math.round((Date.now() - batDau) / 1000) });
  }
  log.end();
  const ketQua = lenh.some((item) => item.maThoat !== 0) ? "do" : "xanh";
  writeFileSync(`gate-${buoc}.json`, JSON.stringify({ buoc, ketQua, lenh }, null, 2));
  return { buoc, ketQua };
}

function chay(command, log) {
  ghi(log, `\n$ ${command}\n`);
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });
    child.stdout.on("data", (chunk) => ghi(log, chunk));
    child.stderr.on("data", (chunk) => ghi(log, chunk));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function ghi(log, chunk) {
  process.stdout.write(chunk);
  log.write(chunk);
}

/** Lệnh cần một công cụ hoặc script chưa có thì trả về thứ còn thiếu. */
function thieuGi(command) {
  const script = command.match(/^node (scripts\/\S+)/)?.[1];
  if (script)
    return existsSync(script) ? null : { ten: `${script} (thêm ở bài 7.5)`, batBuoc: false };
  if (!command.startsWith("gitleaks")) return null;
  const which = process.platform === "win32" ? "where" : "which";
  if (spawnSync(which, ["gitleaks"], { stdio: "ignore" }).status === 0) return null;
  return {
    ten: "gitleaks (macOS: brew install gitleaks · Windows: winget install --id Gitleaks.Gitleaks)",
    batBuoc: true,
  };
}
