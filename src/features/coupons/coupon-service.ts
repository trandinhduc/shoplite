import { coupons as defaultCoupons } from "@/data/coupons";
import type { Coupon, ValidateCouponResult } from "./types";

/**
 * Chuẩn hóa mã coupon: loại bỏ khoảng trắng 2 đầu và chuyển sang chữ in hoa.
 */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Tra cứu mã coupon trong danh mục (mặc định lấy từ src/data/coupons.ts).
 */
export function findCouponByCode(
  code: string,
  catalog: Coupon[] = defaultCoupons,
): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return catalog.find((c) => normalizeCouponCode(c.code) === normalized);
}

/**
 * Kiểm tra xem coupon đã hết hạn sử dụng chưa.
 * Hết hạn vào 23:59:59.999 của ngày expiresAt theo giờ Việt Nam (UTC+7).
 */
export function isCouponExpired(coupon: Coupon, now: Date = new Date()): boolean {
  if (!coupon.expiresAt) return false;
  // Hết hạn vào cuối ngày YYYY-MM-DD theo múi giờ Việt Nam (+07:00)
  const expiryDate = new Date(`${coupon.expiresAt}T23:59:59.999+07:00`);
  return now.getTime() > expiryDate.getTime();
}

/**
 * Tính số tiền giảm giá thực tế (luôn làm tròn, không âm, không vượt quá subtotal).
 */
export function calculateDiscount(coupon: Coupon, subtotal: number): number {
  if (subtotal <= 0) return 0;

  let discount = 0;
  if (coupon.type === "percentage") {
    const rawDiscount = Math.round((subtotal * coupon.value) / 100);
    discount =
      coupon.maxDiscount !== null && coupon.maxDiscount !== undefined
        ? Math.min(rawDiscount, coupon.maxDiscount)
        : rawDiscount;
  } else if (coupon.type === "fixed") {
    discount = coupon.value;
  }

  // Mức giảm tối đa chỉ bằng đúng tạm tính tiền hàng
  return Math.max(0, Math.min(discount, subtotal));
}

/**
 * Xác thực tính hợp lệ của coupon:
 * 1. Coupon phải tồn tại trong danh mục
 * 2. Coupon còn trong thời hạn sử dụng
 * 3. Tạm tính đơn hàng phải đạt giá trị tối thiểu minOrderValue
 */
export function validateCoupon(
  coupon: Coupon | undefined,
  subtotal: number,
  now: Date = new Date(),
): ValidateCouponResult {
  if (!coupon) {
    return {
      valid: false,
      error: {
        code: "COUPON_NOT_FOUND",
        message: "Mã giảm giá không tồn tại",
      },
    };
  }

  if (isCouponExpired(coupon, now)) {
    return {
      valid: false,
      error: {
        code: "COUPON_EXPIRED",
        message: "Mã giảm giá đã hết hạn sử dụng",
      },
    };
  }

  if (subtotal < coupon.minOrderValue) {
    const missingAmount = coupon.minOrderValue - subtotal;
    // Format hiển thị theo chuẩn VND (ví dụ: 100.000 ₫)
    const formattedMin = new Intl.NumberFormat("vi-VN").format(coupon.minOrderValue) + " ₫";
    const formattedMissing = new Intl.NumberFormat("vi-VN").format(missingAmount) + " ₫";

    return {
      valid: false,
      error: {
        code: "COUPON_MIN_ORDER_NOT_MET",
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${formattedMin} (cần mua thêm ${formattedMissing})`,
        details: {
          minOrderValue: String(coupon.minOrderValue),
          amountNeeded: String(missingAmount),
        },
      },
    };
  }

  const discountAmount = calculateDiscount(coupon, subtotal);
  return {
    valid: true,
    coupon,
    discountAmount,
  };
}
