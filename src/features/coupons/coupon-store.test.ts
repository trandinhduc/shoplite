import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppliedCoupon } from "./coupon-rules";
import { COUPON_STORAGE_KEY, couponStore } from "./coupon-store";

const applied: AppliedCoupon = {
  code: "SHOPLITE10",
  rule: {
    code: "SHOPLITE10",
    type: "percent",
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
  },
};

describe("couponStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    couponStore.reset();
  });

  it("lưu mã đã áp dụng vào localStorage", () => {
    couponStore.set(applied);
    expect(JSON.parse(window.localStorage.getItem(COUPON_STORAGE_KEY)!)).toEqual(applied);
    expect(couponStore.getSnapshot()).toEqual(applied);
  });

  it("đọc lại mã đã lưu khi tải trang", () => {
    window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(applied));
    expect(couponStore.getSnapshot()).toEqual(applied);
  });

  it("xóa mã khỏi localStorage", () => {
    couponStore.set(applied);
    couponStore.clear();
    expect(couponStore.getSnapshot()).toBeNull();
    expect(window.localStorage.getItem(COUPON_STORAGE_KEY)).toBeNull();
  });

  it.each(["{not json", JSON.stringify({ code: 1 }), JSON.stringify({ code: "X" })])(
    "bỏ qua dữ liệu hỏng hoặc sai kiểu: %s",
    (raw) => {
      window.localStorage.setItem(COUPON_STORAGE_KEY, raw);
      expect(couponStore.getSnapshot()).toBeNull();
    },
  );

  it("server luôn thấy chưa có mã", () => {
    couponStore.set(applied);
    expect(couponStore.getServerSnapshot()).toBeNull();
  });

  it("đồng bộ khi tab khác thay đổi mã", () => {
    const listener = vi.fn();
    const unsubscribe = couponStore.subscribe(listener);
    window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(applied));
    window.dispatchEvent(new StorageEvent("storage", { key: COUPON_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(couponStore.getSnapshot()).toEqual(applied);
    unsubscribe();
  });

  it("chỉ lưu tối đa một mã: lưu mã mới thì ghi đè mã cũ", () => {
    couponStore.set(applied);
    const giam50k: AppliedCoupon = {
      code: "GIAM50K",
      rule: { code: "GIAM50K", type: "fixed", value: 50_000, minOrderValue: 500_000 },
    };
    couponStore.set(giam50k);
    expect(couponStore.getSnapshot()).toEqual(giam50k);
    expect(JSON.parse(window.localStorage.getItem(COUPON_STORAGE_KEY)!)).toEqual(giam50k);
  });
});
