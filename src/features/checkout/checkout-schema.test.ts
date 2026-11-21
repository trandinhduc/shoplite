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
  const validOrder = {
    customer: {
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "12 Nguyễn Huệ, Quận 1",
    },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [{ productId: "p010", quantity: 1 }],
  };

  it("không bắt buộc có mã", () => {
    const result = placeOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("bỏ khoảng trắng đầu/cuối của mã", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: " shoplite10 ",
    });
    expect(result.data?.couponCode).toBe("shoplite10");
  });

  it("chuỗi rỗng nghĩa là không dùng mã", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: "",
    });
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("báo lỗi tại couponCode khi mã dài hơn 32 ký tự", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: "A".repeat(33),
    });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toEqual({
      couponCode: "Mã giảm giá không hợp lệ",
    });
  });

  it("từ chối mã không phải chuỗi", () => {
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode: 10 }).success).toBe(false);
  });

  it("loại bỏ các trường tiền do client tự gửi", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      discount: 999_999,
      total: 1,
    });
    expect(result.data).not.toHaveProperty("discount");
    expect(result.data).not.toHaveProperty("total");
  });
});
