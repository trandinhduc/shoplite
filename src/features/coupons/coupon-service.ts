import { coupons } from "@/data/coupons";
import { OrderError } from "@/features/orders/order-errors";
import { formatCurrency } from "@/lib/format";
import { checkCouponEligibility, normalizeCouponCode, type Coupon } from "./coupon-rules";

/**
 * Kiểm tra mã theo dữ liệu thật. Chỉ import từ code chạy trên server.
 * Ném OrderError (422) khi mã không tồn tại, hết hạn hoặc chưa đạt giá trị tối thiểu.
 */
export function validateCoupon(
  input: string,
  subtotal: number,
  now: Date,
): { coupon: Coupon; discount: number } {
  const code = normalizeCouponCode(input);
  const coupon = coupons.find((item) => item.code === code);
  if (!coupon) {
    throw new OrderError("COUPON_NOT_FOUND", `Mã giảm giá "${code}" không tồn tại`);
  }

  const result = checkCouponEligibility(coupon, subtotal, now);
  if (result.ok) return { coupon, discount: result.discount };

  if (result.reason === "expired") {
    throw new OrderError("COUPON_EXPIRED", `Mã giảm giá "${code}" đã hết hạn`);
  }
  throw new OrderError(
    "COUPON_MIN_ORDER_NOT_MET",
    `Đơn hàng cần tối thiểu ${formatCurrency(result.minOrderValue)}, mua thêm ${formatCurrency(result.amountNeeded)} để dùng mã`,
    { minOrderValue: String(result.minOrderValue), amountNeeded: String(result.amountNeeded) },
  );
}
