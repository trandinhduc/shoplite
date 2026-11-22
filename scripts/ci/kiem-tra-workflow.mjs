#!/usr/bin/env node
// Soát các workflow có AI trong .github/workflows/ theo 12 luật an toàn (R0-R11) của Module 7.
// Không cần thư viện: đọc YAML theo thụt dòng, đủ cho workflow viết theo kiểu thường gặp.
//
//   node scripts/ci/kiem-tra-workflow.mjs                 # soát cả thư mục
//   node scripts/ci/kiem-tra-workflow.mjs duong/dan.yml   # soát một file (ví dụ phản ví dụ của giảng viên)
//
// Thoát mã 1 khi có ít nhất một LỖI. CẢNH BÁO thì in ra nhưng không làm đỏ gate.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const AI_ACTION = /uses:\s*anthropics\/claude-code-action@/;
const DU_LIEU_PR =
  /\$\{\{\s*github\.(?:event\.(?:pull_request\.(?:title|body|head\.ref|head\.label)|issue\.(?:title|body)|comment\.body|review\.body|head_commit\.message|commits)|head_ref)\b/;

const files = process.argv[2] ? [process.argv[2]] : danhSachWorkflow(".github/workflows");
let soLoi = 0;
let soCanhBao = 0;

for (const file of files) {
  const dong = readFileSync(file, "utf8").split(/\r?\n/);
  const ketQua = soatFile(dong);
  const loi = ketQua.filter((item) => item.muc === "LỖI");
  soLoi += loi.length;
  soCanhBao += ketQua.length - loi.length;
  console.log(`\n${file}: ${loi.length} lỗi, ${ketQua.length - loi.length} cảnh báo`);
  for (const item of ketQua)
    console.log(`  ${item.muc} ${item.luat} dòng ${item.dong}: ${item.loiNhan}`);
}

console.log(`\nTổng: ${soLoi} lỗi, ${soCanhBao} cảnh báo trên ${files.length} workflow.`);
process.exit(soLoi ? 1 : 0);

function soatFile(dong) {
  const ketQua = [];
  const bao = (muc, luat, so, loiNhan) => ketQua.push({ muc, luat, dong: so + 1, loiNhan });
  const text = dong.join("\n");
  const jobs = tachJob(dong);
  const coAi = AI_ACTION.test(text);

  // R0 - AI (hay bất kỳ bước nào) không tự merge, không tự approve.
  dong.forEach((line, i) => {
    if (
      /gh\s+pr\s+merge|gh\s+pr\s+review\b.*--approve|--admin\b|event:\s*["']?APPROVE|\/merges?\b.*-X\s*PUT/i.test(
        line,
      )
    )
      bao(
        "LỖI",
        "R0",
        i,
        "Workflow tự merge hoặc tự approve PR. Quyết định merge là của gate tất định và người duyệt.",
      );
  });

  // R1 - Quyền mặc định của workflow chỉ đọc.
  const perm = dong.findIndex((line) => /^permissions:/.test(line));
  if (perm < 0)
    bao("LỖI", "R1", 0, "Thiếu 'permissions:' ở đầu file - token mặc định có thể có quyền ghi.");
  else if (
    /write-all/.test(dong[perm]) ||
    khoiCon(dong, perm).some((line) => /:\s*write\b/.test(line))
  )
    bao("LỖI", "R1", perm, "Quyền mặc định của workflow phải là chỉ đọc (contents: read) hoặc {}.");

  // R3 - Không dùng pull_request_target cho workflow có AI (chạy với secret của repo trên code của PR).
  dong.forEach((line, i) => {
    if (/pull_request_target/.test(line) && coAi)
      bao("LỖI", "R3", i, "pull_request_target chạy với secret của repo. Dùng 'pull_request'.");
  });

  // R4 - Khoá (token OAuth hoặc khoá API) chỉ vào đúng tham số của bước AI.
  dong.forEach((line, i) => {
    if (/sk-ant-[A-Za-z0-9_-]{10,}/.test(line))
      bao("LỖI", "R4", i, "Khoá viết thẳng trong workflow.");
    if (/secrets\.ANTHROPIC_API_KEY/.test(line) && !/^\s*anthropic_api_key:/.test(line))
      bao(
        "LỖI",
        "R4",
        i,
        "Khoá API chỉ được vào 'with: anthropic_api_key'. Ở env hay run thì mọi bước đều đọc được.",
      );
    if (/secrets\.CLAUDE_CODE_OAUTH_TOKEN/.test(line) && !/^\s*claude_code_oauth_token:/.test(line))
      bao(
        "LỖI",
        "R4",
        i,
        "Token OAuth chỉ được vào 'with: claude_code_oauth_token'. Ở env hay run thì mọi bước đều đọc được.",
      );
  });

  // R7 - Không chèn dữ liệu do người viết PR kiểm soát vào lệnh hay vào prompt.
  for (const [batDau, ketThuc, loai] of cacKhoi(dong, /^\s*(?:-\s+)?(run|prompt):/)) {
    for (let i = batDau; i <= ketThuc; i++) {
      if (DU_LIEU_PR.test(dong[i]))
        bao(
          "LỖI",
          "R7",
          i,
          `Chèn tiêu đề/mô tả/tên nhánh của PR vào '${loai}'. Đưa qua env rồi ghi ra file.`,
        );
    }
  }

  // R8 - Action ghim theo SHA.
  dong.forEach((line, i) => {
    const m = line.match(/uses:\s*([^@\s]+)@(\S+)/);
    if (!m || m[1].startsWith("./") || /^[0-9a-f]{40}$/.test(m[2])) return;
    const chinhChu = /^(actions|github)\//.test(m[1]);
    bao(
      chinhChu ? "CẢNH BÁO" : "LỖI",
      "R8",
      i,
      `${m[1]}@${m[2]} chưa ghim theo SHA 40 ký tự (tag có thể bị dời).`,
    );
  });

  for (const job of jobs) {
    const khoi = dong.slice(job.batDau, job.ketThuc + 1);
    if (!khoi.some((line) => AI_ACTION.test(line))) continue;
    const viTriAi = job.batDau + khoi.findIndex((line) => AI_ACTION.test(line));
    const args = layKhoi(dong, job, /^\s*claude_args:/).join(" ");

    // R2 - Job AI khai báo quyền riêng, tối thiểu.
    const p = khoi.findIndex((line) => /^\s{4}permissions:/.test(line));
    if (p < 0)
      bao(
        "LỖI",
        "R2",
        job.batDau,
        `Job '${job.ten}' gọi AI mà không khai báo 'permissions:' riêng.`,
      );
    else {
      const quyen = [dong[job.batDau + p], ...khoiCon(dong, job.batDau + p)].join("\n");
      if (/write-all|contents:\s*write|actions:\s*write|workflows:\s*write/.test(quyen))
        bao(
          "LỖI",
          "R2",
          job.batDau + p,
          `Job '${job.ten}' gọi AI có quyền ghi code/workflow. AI chỉ cần đọc và đăng nhận xét.`,
        );
      if (/id-token:\s*write/.test(quyen))
        bao(
          "CẢNH BÁO",
          "R2",
          job.batDau + p,
          "id-token: write chỉ cần khi không truyền github_token.",
        );
    }

    // R5 - Có trần thời gian, trần lượt, trần tiền cho MỖI lần chạy.
    const t = khoi.find((line) => /^\s{4}timeout-minutes:/.test(line));
    if (!t) bao("LỖI", "R5", job.batDau, `Job '${job.ten}' thiếu timeout-minutes.`);
    else if (Number(t.split(":")[1]) > 20)
      bao("CẢNH BÁO", "R5", job.batDau, "timeout-minutes trên 20 phút cho một lần review.");
    if (!/--max-turns\s+\d+/.test(args))
      bao("LỖI", "R5", viTriAi, "claude_args thiếu --max-turns.");
    if (!/--max-budget-usd\s+[\d.]+/.test(args))
      bao("LỖI", "R5", viTriAi, "claude_args thiếu --max-budget-usd.");

    // R6 - Công cụ của AI bị giới hạn: không shell tự do, không sửa file, không nạp cấu hình của dự án.
    const allowed = args.match(/--allowedTools\s+"([^"]*)"/)?.[1] ?? "";
    if (!allowed)
      bao("LỖI", "R6", viTriAi, "claude_args thiếu --allowedTools (danh sách công cụ được dùng).");
    for (const tool of allowed.split(",").map((item) => item.trim())) {
      if (/^(Bash|Bash\(\*\)|Bash\(:\*\)|Edit|Write|NotebookEdit|MultiEdit)$/.test(tool))
        bao(
          "LỖI",
          "R6",
          viTriAi,
          `--allowedTools cho phép '${tool}': AI chạy được lệnh tùy ý hoặc sửa code.`,
        );
    }
    if (!/--setting-sources\s+user\b/.test(args))
      bao(
        "LỖI",
        "R6",
        viTriAi,
        "Thiếu --setting-sources user: AI sẽ nạp quyền và hook của dự án (ví dụ được chạy npm test).",
      );
    if (!/--strict-mcp-config/.test(args))
      bao(
        "CẢNH BÁO",
        "R6",
        viTriAi,
        "Thiếu --strict-mcp-config: action tự bật mọi MCP server trong .mcp.json của dự án.",
      );

    // R9 - AI không đọc được token: checkout không giữ token, và cấm Read(./.git/**) vì claude-code-action
    //      tự ghi token của nó vào URL của remote origin trong .git/config.
    if (!/--disallowedTools\s+"[^"]*Read\(\.\/\.git\/\*\*\)/.test(args))
      bao(
        "LỖI",
        "R9",
        viTriAi,
        "--disallowedTools thiếu Read(./.git/**): action ghi token vào .git/config, AI đọc được.",
      );
    khoi.forEach((line, k) => {
      if (!/uses:\s*actions\/checkout@/.test(line)) return;
      const step = dong.slice(job.batDau + k, job.batDau + k + 8).join("\n");
      if (!/persist-credentials:\s*false/.test(step))
        bao(
          "LỖI",
          "R9",
          job.batDau + k,
          "actions/checkout trong job AI phải có persist-credentials: false.",
        );
    });

    // R10 - Job cầm khoá không chạy code của PR (npm ci, npm run, npx, script trong repo).
    dong.slice(job.batDau, viTriAi).forEach((line, k) => {
      if (/\b(npm|npx|yarn|pnpm|bun|uv|make)\s/.test(line) || /\bnode\s+scripts\//.test(line))
        bao(
          "LỖI",
          "R10",
          job.batDau + k,
          "Job cầm khoá chạy code của PR trước bước AI. Lấy script từ main bằng git show.",
        );
    });

    // R11 - Checklist của nhóm lấy từ nhánh đích, không từ PR.
    const prompt = layKhoi(dong, job, /^\s*prompt:/).join("\n");
    if (/review-checklist/.test(prompt) && !/base\.sha|BASE_SHA/.test(khoi.join("\n")))
      bao(
        "LỖI",
        "R11",
        viTriAi,
        "Prompt dùng checklist nhưng job không lấy checklist từ nhánh đích (base.sha).",
      );
  }
  return ketQua;
}

function danhSachWorkflow(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

function thut(line) {
  // "- key:" tính thụt tại cột của key, để các khóa cùng cấp (env:, with:) không thành con.
  return line.match(/^\s*(?:-\s+)?/)[0].length;
}

/** Các dòng con (thụt sâu hơn) của dòng i. */
function khoiCon(dong, i) {
  const con = [];
  for (let k = i + 1; k < dong.length; k++) {
    if (dong[k].trim() === "") continue;
    if (thut(dong[k]) <= thut(dong[i])) break;
    con.push(dong[k]);
  }
  return con;
}

/** Các job dưới "jobs:" (thụt 2 dấu cách). */
function tachJob(dong) {
  const jobs = [];
  const bd = dong.findIndex((line) => /^jobs:/.test(line));
  if (bd < 0) return jobs;
  for (let i = bd + 1; i < dong.length; i++) {
    const m = dong[i].match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (m) jobs.push({ ten: m[1], batDau: i, ketThuc: dong.length - 1 });
    else if (/^\S/.test(dong[i])) break;
  }
  jobs.forEach((job, k) => {
    if (jobs[k + 1]) job.ketThuc = jobs[k + 1].batDau - 1;
  });
  return jobs;
}

/** Khối "run:" hoặc "prompt:" (một dòng hoặc nhiều dòng dạng |). */
function cacKhoi(dong, mau) {
  const khoi = [];
  dong.forEach((line, i) => {
    const m = line.match(mau);
    if (m) khoi.push([i, i + khoiCon(dong, i).length, m[1]]);
  });
  return khoi;
}

function layKhoi(dong, job, mau) {
  for (let i = job.batDau; i <= job.ketThuc; i++) {
    if (mau.test(dong[i])) return [dong[i], ...khoiCon(dong, i)];
  }
  return [];
}
