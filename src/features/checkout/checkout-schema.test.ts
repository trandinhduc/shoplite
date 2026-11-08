import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  placeOrderSchema,
  toFieldErrors,
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

describe("placeOrderSchema - mã giảm giá", () => {
  const validOrder = {
    customer: { fullName: "Nguyễn Văn A", phone: "0912345678", address: "12 Nguyễn Huệ, Quận 1" },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [{ productId: "p006", quantity: 2 }],
  };

  it("cho phép không gửi mã giảm giá", () => {
    expect(placeOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("chấp nhận mã giảm giá và bỏ khoảng trắng đầu/cuối", () => {
    const result = placeOrderSchema.safeParse({ ...validOrder, couponCode: " shoplite10 " });
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBe("shoplite10");
  });

  it("chấp nhận mã dài đúng 32 ký tự, từ chối 33 ký tự", () => {
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode: "A".repeat(32) }).success).toBe(
      true,
    );
    const result = placeOrderSchema.safeParse({ ...validOrder, couponCode: "A".repeat(33) });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toHaveProperty("couponCode");
  });

  it.each([
    ["mảng nhiều mã", ["SHOPLITE10", "GIAM50K"]],
    ["số", 123],
    ["null", null],
    ["object", {}],
  ])("từ chối couponCode kiểu %s", (_label, couponCode) => {
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode }).success).toBe(false);
  });

  it("bỏ các số tiền do client tự gửi lên", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: "SHOPLITE10",
      discount: 999_999,
      subtotal: 1,
      total: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("discount");
    expect(result.data).not.toHaveProperty("subtotal");
    expect(result.data).not.toHaveProperty("total");
  });
});
