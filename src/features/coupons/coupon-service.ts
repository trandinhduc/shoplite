/**
 * Tra mã giảm giá và kiểm tra mã cho giỏ hàng — CHỈ dùng phía server (Route Handler,
 * order-service). Đây là file duy nhất được import `@/data/coupons` (FR-022a).
 */
import { coupons } from "@/data/coupons";
import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import { toFieldErrors, validateCouponSchema } from "@/features/checkout/checkout-schema";
import { calculateSubtotal } from "@/features/checkout/pricing";
import { OrderError, type OrderErrorCode } from "@/features/orders/order-errors";
import { evaluateCoupon, getCouponErrorMessage, normalizeCouponCode } from "./coupon-rules";
import type { Coupon, CouponFailure, CouponFailureReason, CouponRule } from "./types";

/** Tìm mã (không phân biệt hoa/thường, bỏ khoảng trắng đầu/cuối). */
export function findCouponByCode(code: string, list: Coupon[] = coupons): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return list.find((coupon) => coupon.code === normalized);
}

const ERROR_CODE_BY_REASON: Record<CouponFailureReason, OrderErrorCode> = {
  NOT_FOUND: "COUPON_NOT_FOUND",
  EXPIRED: "COUPON_EXPIRED",
  MIN_SUBTOTAL_NOT_MET: "COUPON_MIN_SUBTOTAL_NOT_MET",
};

/**
 * Chuyển kết quả kiểm tra mã thất bại thành OrderError (HTTP 422) với thông báo tiếng Việt.
 * Lỗi chưa đạt tối thiểu kèm `details` { minSubtotal, shortfall } dạng chuỗi số.
 */
export function toCouponError(failure: CouponFailure): OrderError {
  const details =
    failure.reason === "MIN_SUBTOTAL_NOT_MET"
      ? {
          minSubtotal: String(failure.minSubtotal),
          shortfall: String(failure.shortfall),
        }
      : undefined;
  return new OrderError(
    ERROR_CODE_BY_REASON[failure.reason],
    getCouponErrorMessage(failure),
    details,
  );
}

export interface CouponServiceDeps {
  findCoupon?: (code: string) => Coupon | undefined;
  findProduct?: (id: string) => Product | undefined;
  now?: () => Date;
}

export interface ValidateCouponResult {
  /** Quy tắc của đúng mã đã gửi — client dùng để tự tính lại khi giỏ hàng đổi. */
  coupon: CouponRule;
  subtotal: number;
  discount: number;
}

export function createCouponService({
  findCoupon = findCouponByCode,
  findProduct = getProductById,
  now = () => new Date(),
}: CouponServiceDeps = {}) {
  return {
    /**
     * Kiểm tra một mã cho giỏ hàng hiện tại (phục vụ hiển thị ở trang thanh toán).
     * Giá lấy từ catalog; bỏ qua mọi con số tiền client gửi lên.
     */
    validateCoupon(input: unknown): ValidateCouponResult {
      const parsed = validateCouponSchema.safeParse(input);
      if (!parsed.success) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Dữ liệu kiểm tra mã không hợp lệ",
          toFieldErrors(parsed.error),
        );
      }

      const lines = parsed.data.items.map(({ productId, quantity }) => {
        const product = findProduct(productId);
        if (!product) {
          throw new OrderError("PRODUCT_NOT_FOUND", `Không tìm thấy sản phẩm "${productId}"`);
        }
        return { unitPrice: product.price, quantity };
      });
      const subtotal = calculateSubtotal(lines);

      const coupon = findCoupon(parsed.data.code);
      const evaluation = evaluateCoupon(coupon, subtotal, now());
      if (!evaluation.ok) {
        throw toCouponError(evaluation);
      }
      if (!coupon) {
        // Không xảy ra: evaluateCoupon đã trả NOT_FOUND khi không có mã.
        throw toCouponError({ ok: false, reason: "NOT_FOUND" });
      }

      return { coupon, subtotal, discount: evaluation.discount };
    },
  };
}

export type CouponService = ReturnType<typeof createCouponService>;

export const couponService = createCouponService();
