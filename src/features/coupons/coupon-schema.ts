/**
 * Schema của mã giảm giá, dùng chung client và server.
 * KHÔNG import từ `@/features/checkout` để tránh vòng import (checkout-schema import file này).
 */
import { z } from "zod";

/** Độ dài tối đa của mã sau khi bỏ khoảng trắng đầu/cuối (FR-004). */
export const COUPON_CODE_MAX_LENGTH = 32;

export const couponCodeSchema = z
  .string("Mã giảm giá không hợp lệ")
  .trim()
  .min(1, "Vui lòng nhập mã giảm giá")
  .max(COUPON_CODE_MAX_LENGTH, `Mã giảm giá tối đa ${COUPON_CODE_MAX_LENGTH} ký tự`);
