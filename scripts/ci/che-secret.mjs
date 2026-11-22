#!/usr/bin/env node
// Che các chuỗi trông giống secret TRƯỚC KHI gửi log cho AI hoặc dán lên PR.
// GitHub chỉ tự che secret đã khai báo trong repo (hiện ***). Khoá của dịch vụ khác,
// token in ra từ một lệnh `env`, mật khẩu trong URL... vẫn nằm nguyên trong log.
//
//   node scripts/ci/che-secret.mjs < ci.log > ci.da-che.log      # dùng ở máy
//   import { cheSecret } from "./che-secret.mjs"                 # dùng trong gom-log.mjs

import { pathToFileURL } from "node:url";

const MAU = [
  ["khoá riêng", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ["Anthropic", /\bsk-ant-[A-Za-z0-9_-]{16,}/g],
  ["OpenAI", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ["GitHub", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ["npm", /\bnpm_[A-Za-z0-9]{36}\b/g],
  ["AWS", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["Google", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["Slack", /\bxox[abposr]-[A-Za-z0-9-]{10,}/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
];

// Giữ phần "tên=" để người đọc còn biết dòng đó nói về cái gì, chỉ che giá trị.
const MAU_GIU_DAU = [
  ["mật khẩu trong URL", /(\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:)([^\s@/]{3,})(@)/gi],
  ["Bearer", /(\bBearer\s+)([A-Za-z0-9._~+/-]{16,}=*)()/g],
  [
    "biến bí mật",
    /(\b[A-Z0-9_]*(?:API_?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*["']?\s*[:=]\s*["']?)([^\s"'*]{6,})()/gi,
  ],
];

export function cheSecret(text) {
  const theoLoai = {};
  const dem = (loai) => (theoLoai[loai] = (theoLoai[loai] ?? 0) + 1);
  let ketQua = text;
  for (const [loai, mau] of MAU) {
    ketQua = ketQua.replace(mau, () => {
      dem(loai);
      return `[ĐÃ CHE: ${loai}]`;
    });
  }
  for (const [loai, mau] of MAU_GIU_DAU) {
    ketQua = ketQua.replace(mau, (khop, dau, giaTri, cuoi) => {
      if (giaTri.startsWith("[ĐÃ CHE")) return khop;
      dem(loai);
      return `${dau}[ĐÃ CHE: ${loai}]${cuoi}`;
    });
  }
  const soLan = Object.values(theoLoai).reduce((tong, so) => tong + so, 0);
  return { text: ketQua, soLan, theoLoai };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const { text, soLan, theoLoai } = cheSecret(input);
  process.stdout.write(text);
  console.error(`Đã che ${soLan} chuỗi giống secret ${soLan ? JSON.stringify(theoLoai) : ""}`);
}
