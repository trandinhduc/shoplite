import { coupons } from "@/data/coupons";
import { couponCodeSchema } from "@/features/checkout/checkout-schema";
import { calculateCouponDiscount } from "@/features/checkout/pricing";
import { OrderError } from "@/features/orders/order-errors";
import type { Order } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";
import { isCouponExpired, normalizeCouponCode } from "./coupon-rules";
import type { Coupon, CouponEvaluation, ExpiredCouponNotice } from "./types";

/**
 * Phần đọc dữ liệu mã giảm giá - đọc `src/data/coupons.ts` nên CHỈ import từ server
 * (service, route handler, Server Component). Không import vào Client Component.
 */

/** Tra mã theo chuỗi khách nhập (không phân biệt hoa/thường, bỏ khoảng trắng đầu cuối). */
export function findCouponByCode(
  code: string,
  list: readonly Coupon[] = coupons,
): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return list.find((coupon) => coupon.code === normalized);
}

/** Chuyển kết quả kiểm tra thất bại thành `OrderError` (cả ba mã lỗi đều trả HTTP 422). */
export function toCouponError(
  evaluation: Extract<CouponEvaluation, { ok: false }>,
  code: string,
): OrderError {
  switch (evaluation.reason) {
    case "NOT_FOUND":
      return new OrderError("COUPON_NOT_FOUND", `Mã giảm giá "${code}" không tồn tại`);
    case "EXPIRED":
      return new OrderError("COUPON_EXPIRED", `Mã giảm giá "${code}" đã hết hạn`);
    case "MIN_ORDER_NOT_MET":
      return new OrderError(
        "COUPON_MIN_ORDER_NOT_MET",
        `Đơn hàng cần tối thiểu ${formatCurrency(evaluation.minOrderValue)} để dùng mã ${code}. ` +
          `Bạn cần mua thêm ${formatCurrency(evaluation.missingAmount)}`,
        {
          minOrderValue: String(evaluation.minOrderValue),
          missingAmount: String(evaluation.missingAmount),
        },
      );
  }
}

/**
 * Thông báo "mã đã hết hạn lúc đặt hàng" cho trang chi tiết đơn.
 * `rawCode` đến từ tham số URL nên KHÔNG tin cậy: validate bằng Zod và chỉ trả kết quả khi mã
 * thật sự đã hết hạn tại `now`. Mọi trường hợp khác (sai kiểu, quá dài, không tồn tại, còn hạn) trả `null`.
 */
export function getExpiredCouponNotice(
  rawCode: unknown,
  subtotal: number,
  now: Date = new Date(),
): ExpiredCouponNotice | null {
  const parsed = couponCodeSchema.safeParse(rawCode);
  if (!parsed.success) return null;

  const coupon = findCouponByCode(parsed.data);
  if (!coupon || !isCouponExpired(coupon, now)) return null;

  return {
    couponCode: coupon.code,
    lostDiscount: calculateCouponDiscount(coupon, subtotal),
  };
}

/** Như `getExpiredCouponNotice` nhưng dùng tạm tính của đơn, và bỏ qua đơn đã áp mã. */
export function getExpiredCouponNoticeForOrder(
  order: Pick<Order, "couponCode" | "subtotal">,
  rawCode: unknown,
  now: Date = new Date(),
): ExpiredCouponNotice | null {
  if (order.couponCode) return null;
  return getExpiredCouponNotice(rawCode, order.subtotal, now);
}
