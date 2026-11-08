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
    const result = checkoutFormSchema.safeParse({
      ...validForm,
      shippingMethod: "drone",
    });
    expect(result.success).toBe(false);
  });
});

describe("placeOrderSchema - couponCode", () => {
  const validPayload = {
    customer: {
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [{ productId: "p001", quantity: 1 }],
  };

  it("bỏ khoảng trắng đầu/cuối của mã", () => {
    const result = placeOrderSchema.safeParse({
      ...validPayload,
      couponCode: " SHOPLITE10 ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBe("SHOPLITE10");
  });

  it("không có mã vẫn hợp lệ", () => {
    const result = placeOrderSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("từ chối mã dài 33 ký tự", () => {
    expect(
      placeOrderSchema.safeParse({
        ...validPayload,
        couponCode: "A".repeat(33),
      }).success,
    ).toBe(false);
  });

  it("loại bỏ mọi trường tiền do client gửi lên", () => {
    const result = placeOrderSchema.safeParse({
      ...validPayload,
      couponCode: "SHOPLITE10",
      discount: 999_999,
      total: 1,
      subtotal: 1,
      items: [{ productId: "p001", quantity: 1, unitPrice: 1 }],
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("discount");
    expect(result.data).not.toHaveProperty("total");
    expect(result.data).not.toHaveProperty("subtotal");
    expect(result.data?.items[0]).not.toHaveProperty("unitPrice");
  });
});
