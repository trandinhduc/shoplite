import { calculateCouponDiscount } from "@/features/checkout/pricing";
import type { Coupon, CouponEvaluation, CouponPreview } from "./types";

/**
 * Quy tắc kiểm tra mã giảm giá - hàm thuần, dùng được ở cả client và server.
 * Không import dữ liệu mã (`src/data/coupons.ts`): danh sách mã chỉ nằm ở server.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** " shoplite10 " -> "SHOPLITE10". Không sửa khoảng trắng ở giữa mã. */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Mã còn dùng được hết ngày `expiresOn` theo giờ Việt Nam (UTC+7) và hết hạn từ 00:00 ngày kế tiếp.
 * Ghi tường minh offset +07:00 nên kết quả không phụ thuộc múi giờ của máy chủ.
 */
export function isCouponExpired(coupon: Pick<Coupon, "expiresOn">, now: Date): boolean {
  if (!coupon.expiresOn) return false;
  const startOfExpiryDay = new Date(`${coupon.expiresOn}T00:00:00+07:00`).getTime();
  return now.getTime() >= startOfExpiryDay + MS_PER_DAY;
}

/** Kiểm tra theo thứ tự: tồn tại → hết hạn → đơn tối thiểu. `subtotal` là tạm tính trước giảm giá. */
export function evaluateCoupon(
  coupon: Coupon | undefined,
  subtotal: number,
  now: Date,
): CouponEvaluation {
  if (!coupon) return { ok: false, reason: "NOT_FOUND" };
  if (isCouponExpired(coupon, now)) return { ok: false, reason: "EXPIRED", coupon };

  const minOrderValue = coupon.minOrderValue ?? 0;
  if (subtotal < minOrderValue) {
    return {
      ok: false,
      reason: "MIN_ORDER_NOT_MET",
      coupon,
      minOrderValue,
      missingAmount: minOrderValue - subtotal,
    };
  }

  return {
    ok: true,
    coupon,
    discount: calculateCouponDiscount(coupon, subtotal),
  };
}

/**
 * Quy tắc của một mã gửi cho trình duyệt: chỉ gồm các trường cần để hiển thị và tính lại tiền giảm.
 * Không có hạn dùng và không chứa thông tin của mã khác.
 */
export function toCouponPreviewRule(coupon: Coupon): CouponPreview["coupon"] {
  const minOrder =
    coupon.minOrderValue === undefined ? {} : { minOrderValue: coupon.minOrderValue };
  if (coupon.type === "percent") {
    return {
      code: coupon.code,
      type: "percent",
      percent: coupon.percent,
      maxDiscount: coupon.maxDiscount,
      ...minOrder,
    };
  }
  return { code: coupon.code, type: "fixed", amount: coupon.amount, ...minOrder };
}
