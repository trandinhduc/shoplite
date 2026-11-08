import { describe, expect, it } from "vitest";
import { MAX_QUANTITY_PER_ITEM } from "@/features/cart/cart-reducer";
import { COUPON_CODE_MAX_LENGTH } from "@/features/coupons/coupon-schema";
import {
  checkoutFormSchema,
  placeOrderSchema,
  toFieldErrors,
  validateCouponSchema,
  VN_PHONE_REGEX,
} from "./checkout-schema";

const validForm = {
  fullName: "Nguyễn Văn A",
  phone: "0912345678",
  email: "",
  address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  note: "",
  shippingMethod: "standard",
  paymentMethod: "cod",
};

describe("VN_PHONE_REGEX", () => {
  it.each(["0912345678", "0387654321", "+84912345678"])("chấp nhận %s", (phone) => {
    expect(VN_PHONE_REGEX.test(phone)).toBe(true);
  });

  it.each(["091234567", "0212345678", "84912345678", "09123456789", "abc"])(
    "từ chối %s",
    (phone) => {
      expect(VN_PHONE_REGEX.test(phone)).toBe(false);
    },
  );
});

describe("checkoutFormSchema", () => {
  it("chấp nhận dữ liệu hợp lệ, email để trống", () => {
    expect(checkoutFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("trả về lỗi theo từng field", () => {
    const result = checkoutFormSchema.safeParse({
      ...validForm,
      fullName: "A",
      phone: "123",
      email: "khong-phai-email",
      address: "ngắn",
    });
    expect(result.success).toBe(false);
    const errors = toFieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["address", "email", "fullName", "phone"]);
    expect(errors.phone).toMatch(/Số điện thoại không hợp lệ/);
  });

  it("từ chối phương thức giao hàng không hỗ trợ", () => {
    const result = checkoutFormSchema.safeParse({ ...validForm, shippingMethod: "drone" });
    expect(result.success).toBe(false);
  });
});

describe("validateCouponSchema", () => {
  const items = [{ productId: "p006", quantity: 1 }];

  it("chấp nhận mã và danh sách sản phẩm hợp lệ, bỏ khoảng trắng của mã", () => {
    const result = validateCouponSchema.safeParse({
      code: " shoplite10 ",
      items,
    });
    expect(result.success).toBe(true);
    expect(result.data?.code).toBe("shoplite10");
  });

  it("báo lỗi theo trường khi mã rỗng", () => {
    const result = validateCouponSchema.safeParse({ code: "", items });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toMatchObject({
      code: "Vui lòng nhập mã giảm giá",
    });
  });

  it("từ chối giỏ hàng trống", () => {
    expect(validateCouponSchema.safeParse({ code: "SHOPLITE10", items: [] }).success).toBe(false);
  });

  it.each([0, MAX_QUANTITY_PER_ITEM + 1])("từ chối số lượng %i", (quantity) => {
    const result = validateCouponSchema.safeParse({
      code: "SHOPLITE10",
      items: [{ productId: "p006", quantity }],
    });
    expect(result.success).toBe(false);
  });

  it("chấp nhận số lượng tối đa", () => {
    const result = validateCouponSchema.safeParse({
      code: "SHOPLITE10",
      items: [{ productId: "p006", quantity: MAX_QUANTITY_PER_ITEM }],
    });
    expect(result.success).toBe(true);
  });
});

describe("placeOrderSchema - couponCode", () => {
  const validOrder = {
    customer: {
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "12 Nguyễn Huệ, Quận 1",
    },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [{ productId: "p006", quantity: 1 }],
  };

  it("hợp lệ khi không có mã giảm giá", () => {
    const result = placeOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("nhận mã giảm giá và bỏ khoảng trắng đầu/cuối", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: " shoplite10 ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBe("shoplite10");
  });

  it.each([
    ["chuỗi rỗng", ""],
    ["chỉ khoảng trắng", "   "],
    ["dài hơn giới hạn", "A".repeat(COUPON_CODE_MAX_LENGTH + 1)],
    ["số", 10],
    ["nhiều mã", ["A", "B"]],
  ])("từ chối mã giảm giá %s", (_label, couponCode) => {
    const result = placeOrderSchema.safeParse({ ...validOrder, couponCode });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toHaveProperty(["couponCode"]);
  });
});
