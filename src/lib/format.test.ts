import { describe, expect, it } from "vitest";
import { formatCurrency, normalizeText } from "./format";

describe("formatCurrency", () => {
  it("định dạng số tiền theo VND", () => {
    expect(formatCurrency(1_290_000)).toBe("1.290.000 ₫");
    expect(formatCurrency(0)).toBe("0 ₫");
    expect(formatCurrency(-150_000)).toBe("-150.000 ₫");
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
