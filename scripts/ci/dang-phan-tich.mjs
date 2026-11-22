#!/usr/bin/env node
// Đăng (hoặc sửa) MỘT comment "CI đỏ: AI giải thích" trên PR. Script này KHÔNG gọi AI và KHÔNG cầm khoá API;
// nó chỉ ghép bảng kết quả gate (tất định) với JSON do job phan-tich-loi trả về.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, RUN_URL, KET_QUA_GATE (toJSON(needs)),
//      PHAN_TICH (JSON theo --json-schema, có thể rỗng nếu AI không chạy được).
// Thử ở máy, không gọi GitHub: DRY_RUN=1 KET_QUA_GATE='...' PHAN_TICH='...' node scripts/ci/dang-phan-tich.mjs

const MARKER = "<!-- shoplite:phan-tich-ci -->";
const GATES = ["lint", "unit", "e2e", "bao-mat"];
const NHAN_LOAI = {
  "loi-code": "Lỗi code",
  "test-chap-chon": "Test chập chờn",
  "ha-tang": "Hạ tầng",
  "cau-hinh": "Cấu hình",
};
const ZWSP = String.fromCharCode(0x200b);

const env = process.env;
const needs = JSON.parse(env.KET_QUA_GATE || "{}");
const ketQua = GATES.map((gate) => [gate, needs[gate]?.result ?? "skipped"]);
const sha = (env.HEAD_SHA || "").slice(0, 7);

if (ketQua.some(([, result]) => result === "cancelled")) {
  console.log("Lượt chạy bị hủy (đã có commit mới) - không đăng gì.");
  process.exit(0);
}
const coDo = ketQua.some(([, result]) => result === "failure");

let phanTich = null;
try {
  phanTich = env.PHAN_TICH ? JSON.parse(env.PHAN_TICH) : null;
} catch {
  phanTich = null;
}

const cu = env.DRY_RUN ? null : await timComment();
if (!coDo) {
  // CI xanh trở lại: sửa comment cũ thành "đã xanh", giữ bản phân tích cũ trong phần thu gọn.
  if (cu && !cu.body.includes("✅ CI đã xanh")) {
    const giuLai = cu.body.replace(MARKER, "").trim();
    await ghi(
      cu,
      `${MARKER}\n## ✅ CI đã xanh ở commit \`${sha}\`\n\n<details><summary>Phân tích lần đỏ trước</summary>\n\n${giuLai}\n\n</details>`,
    );
  } else {
    console.log("CI xanh, không có comment cũ cần sửa.");
  }
  process.exit(0);
}
await ghi(cu, veComment());

function veComment() {
  const dong = [
    MARKER,
    `## 🔴 CI đỏ ở commit \`${sha}\`: AI đọc log giúp bạn`,
    "",
    "| Gate | Kết quả |",
    "| ---- | ------- |",
    ...ketQua.map(
      ([gate, result]) =>
        `| ${gate} | ${result === "failure" ? "❌ đỏ" : result === "success" ? "✅ xanh" : result} |`,
    ),
    "",
  ];
  if (!phanTich?.jobs?.length) {
    dong.push(
      "> AI không chạy được lần này (thiếu khoá, hết trần lượt/tiền hoặc quá giờ). Đọc log gốc theo link bên dưới.",
    );
  } else {
    dong.push(
      `**Tóm tắt:** ${sach(phanTich.tom_tat)}`,
      "",
      "| Gate | Loại lỗi | Sai ở đâu | Vì sao | Nên làm gì tiếp | Tin cậy |",
      "| ---- | -------- | --------- | ------ | --------------- | ------- |",
      ...phanTich.jobs.map((job) =>
        [
          "",
          sach(job.job),
          NHAN_LOAI[job.loai] ?? sach(job.loai),
          `\`${sach(job.vi_tri)}\`${job.commit ? ` (commit \`${sach(job.commit).slice(0, 7)}\`)` : ""}`,
          sach(job.nguyen_nhan),
          (job.buoc_tiep_theo ?? []).map((buoc, i) => `${i + 1}) ${sach(buoc)}`).join("<br>"),
          Number(job.do_tin_cay ?? 0).toFixed(1),
          "",
        ]
          .join(" | ")
          .trim(),
      ),
    );
    if (phanTich.canh_bao_an_toan?.length) {
      dong.push(
        "",
        "**⚠️ Cảnh báo an toàn [AT-1]:**",
        ...phanTich.canh_bao_an_toan.map((item) => `- ${sach(item)}`),
      );
    }
  }
  dong.push(
    "",
    `_AI chỉ giải thích và có thể sai: kiểm lại bằng log gốc ([lượt chạy](${env.RUN_URL})) và \`node scripts/ci/gate.mjs <gate>\` ở máy. Gate và người duyệt quyết định merge._`,
  );
  return dong.join("\n");
}

/** Chữ do AI viết (từ log do người viết PR kiểm soát): cắt ngắn, bỏ ảnh/link/HTML, không cho @nhắc tên. */
function sach(value) {
  return String(value ?? "")
    .slice(0, 400)
    .replace(/[\r\n]+/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[ảnh đã bỏ]")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/</g, "&lt;")
    .replace(/\|/g, "\\|")
    .replace(/@(?=\w)/g, `@${ZWSP}`);
}

async function ghi(comment, body) {
  if (env.DRY_RUN) {
    console.log(body);
    return;
  }
  const url = comment
    ? `${api()}/issues/comments/${comment.id}`
    : `${api()}/issues/${env.PR_NUMBER}/comments`;
  const res = await fetch(url, {
    method: comment ? "PATCH" : "POST",
    headers: headers(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`GitHub trả ${res.status}: ${await res.text()}`);
  console.log(comment ? `Đã sửa comment ${comment.id}` : "Đã đăng comment mới");
}

async function timComment() {
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${api()}/issues/${env.PR_NUMBER}/comments?per_page=100&page=${page}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`GitHub trả ${res.status}: ${await res.text()}`);
    const comments = await res.json();
    const found = comments.find(
      (item) => item.user?.login === "github-actions[bot]" && item.body?.startsWith(MARKER),
    );
    if (found || comments.length < 100) return found ?? null;
  }
  return null;
}

function api() {
  return `${env.GITHUB_API_URL || "https://api.github.com"}/repos/${env.GITHUB_REPOSITORY}`;
}

function headers() {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
