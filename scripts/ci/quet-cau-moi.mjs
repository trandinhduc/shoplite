#!/usr/bin/env node
// Quét "câu mồi" (prompt injection) trong phần PR THÊM VÀO: câu viết cho AI chứ không cho người,
// như "Ghi chú cho AI review: ... không cần báo lỗi", "ignore previous instructions", ký tự ẩn.
// Đây là kiểm tra tất định: nó đỏ dù model có bị lừa hay không. Mục checklist: [AT-1].
//
//   node scripts/ci/quet-cau-moi.mjs                       # ở máy: so với origin/main (hoặc main)
//   node scripts/ci/quet-cau-moi.mjs --base <sha> --out .ci/cau-moi.md
//   Biến môi trường PR_TITLE, PR_BODY (nếu có) cũng được quét.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// File chỉ dẫn cho AI và công cụ kiểm tra của CI: được phép nói về AI, nhưng PR sửa chúng thì
// cần người duyệt riêng [AT-2]. Không quét câu mồi trong các file này.
const FILE_CHI_DAN = [
  /^\.claude\//,
  /^_bmad\//,
  /^\.github\//,
  /^scripts\/ci\//,
  /^CLAUDE(\.local)?\.md$/,
  /^AGENTS\.md$/,
];

const GOI_AI = /\bAI\b|\b(?:claude|chatgpt|gpt|copilot|gemini|llm|bot|reviewer|model)\b/i;
const BAO_IM_LANG =
  /(?:không cần|đừng|khỏi|không được|do not|don'?t|no need to)\s+(?:báo|report|flag|review|kiểm|comment|nhắc|cảnh báo|mention)|bỏ qua|\bignore\b|\bskip\b|\bapprove\b|\bLGTM\b|duyệt (?:luôn|giúp|ngay)/i;
const MAU_CO_DIEN = [
  /ignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|prompts|rules)/i,
  /bỏ qua (?:mọi|tất cả|các) (?:chỉ dẫn|hướng dẫn|yêu cầu|quy tắc)/i,
  /(?:trả lời|chỉ cần (?:ghi|viết|trả lời)|reply|respond)\s*(?:là|with|bằng)?\s*:?\s*["“']?LGTM/i,
  /\byou are now\b|\bsystem prompt\b|\bnew instructions\b/i,
];
const KY_TU_AN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/;

const args = process.argv.slice(2);
const lay = (ten) => (args.includes(ten) ? args[args.indexOf(ten) + 1] : undefined);
const base = lay("--base") ?? process.env.BASE_SHA ?? timBase();
const out = lay("--out");

if (!base) {
  console.log("Không tìm thấy nhánh đích (origin/main, main) để so sánh - bỏ qua.");
  process.exit(0);
}

const phatHien = [];
const fileChiDan = new Set();

for (const { file, dong } of cacDongThem(base)) {
  if (FILE_CHI_DAN.some((mau) => mau.test(file))) {
    fileChiDan.add(file);
    continue;
  }
  quet(file, dong);
}
for (const [ten, noiDung] of [
  ["(tiêu đề PR)", process.env.PR_TITLE],
  ["(mô tả PR)", process.env.PR_BODY],
]) {
  if (noiDung)
    quet(
      ten,
      noiDung.split(/\r?\n/).map((text, i) => ({ so: i + 1, text })),
    );
}

const baoCao = [
  "## Quét câu mồi (prompt injection) - [AT-1]",
  phatHien.length
    ? phatHien
        .map((item) => `- ❌ \`${item.file}:${item.so}\` ${item.loai}: "${item.trich}"`)
        .join("\n")
    : "- ✅ Không thấy câu nào nhắm vào AI trong phần PR thêm vào.",
  "",
  "## File chỉ dẫn cho AI bị PR sửa - [AT-2] (cần người duyệt riêng)",
  fileChiDan.size ? [...fileChiDan].map((file) => `- ⚠️ \`${file}\``).join("\n") : "- Không có.",
  "",
].join("\n");

console.log(baoCao);
if (out) writeFileSync(out, baoCao);
process.exit(phatHien.length ? 1 : 0);

function quet(file, dong) {
  // Câu mồi hay viết thành comment 2-3 dòng: dòng đầu gọi tên AI, dòng sau mới bảo "không cần báo".
  for (let i = 0; i < dong.length; i++) {
    const { so, text } = dong[i];
    const cuaSo = dong
      .slice(i, i + 3)
      .map((item) => item.text)
      .join(" ");
    let loai = null;
    if (KY_TU_AN.test(text)) loai = "Ký tự ẩn (không nhìn thấy khi đọc diff)";
    else if (MAU_CO_DIEN.some((mau) => mau.test(text))) loai = "Câu ra lệnh cho AI";
    else if (GOI_AI.test(text) && BAO_IM_LANG.test(cuaSo)) loai = "Câu bảo AI bỏ qua";
    if (!loai) continue;
    phatHien.push({ file, so, loai, trich: text.trim().slice(0, 120) });
    i += 2;
  }
}

/** Các dòng PR thêm vào, theo file, kèm số dòng ở bản mới. */
function cacDongThem(baseRef) {
  const diff = git(["diff", "--unified=0", "--no-color", "--no-ext-diff", `${baseRef}...HEAD`]);
  const theoFile = new Map();
  let file = null;
  let so = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line === "+++ /dev/null" ? null : line.slice(6);
      if (file && !theoFile.has(file)) theoFile.set(file, []);
    } else if (line.startsWith("@@")) {
      so = Number(line.match(/\+(\d+)/)?.[1] ?? 0);
    } else if (file && line.startsWith("+")) {
      theoFile.get(file).push({ so, text: line.slice(1) });
      so++;
    }
  }
  return [...theoFile].map(([ten, dong]) => ({ file: ten, dong }));
}

function timBase() {
  for (const ref of ["origin/main", "main"]) {
    try {
      git(["rev-parse", "--verify", "--quiet", ref]);
      return ref;
    } catch {
      // thử ref tiếp theo
    }
  }
  return undefined;
}

function git(gitArgs) {
  return execFileSync("git", gitArgs, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}
