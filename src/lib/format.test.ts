import { describe, expect, it } from "vitest";
import { formatCurrency, normalizeText } from "./format";

// Intl dùng khoảng trắng không ngắt (U+00A0) trước ký hiệu ₫
const plain = (value: string) => value.replace(/ /g, " ");

describe("formatCurrency", () => {
  it("định dạng số tiền theo VND", () => {
    expect(plain(formatCurrency(1_290_000))).toBe("1.290.000 ₫");
    expect(plain(formatCurrency(0))).toBe("0 ₫");
  });
});

describe("normalizeText", () => {
  it("bỏ dấu tiếng Việt, chữ đ và chuyển về chữ thường", () => {
    expect(normalizeText("Bàn Phím Cơ")).toBe("ban phim co");
    expect(normalizeText("Đồng hồ")).toBe("dong ho");
  });

  it("gộp khoảng trắng thừa", () => {
    expect(normalizeText("  tai   nghe ")).toBe("tai nghe");
  });
});
