import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  couponCodeInputSchema,
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
      address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [{ productId: "p001", quantity: 1 }],
  };

  it("không bắt buộc couponCode", () => {
    const parsed = placeOrderSchema.safeParse(validOrder);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.couponCode).toBeUndefined();
  });

  it("trim couponCode", () => {
    const parsed = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: "  giam50k ",
    });
    expect(parsed.data?.couponCode).toBe("giam50k");
  });

  it.each(["", "   "])("coi %j như không có mã", (couponCode) => {
    const parsed = placeOrderSchema.safeParse({ ...validOrder, couponCode });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.couponCode).toBeUndefined();
  });

  it("chấp nhận đúng 32 ký tự, từ chối 33 ký tự", () => {
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode: "A".repeat(32) }).success).toBe(
      true,
    );
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode: "A".repeat(33) }).success).toBe(
      false,
    );
  });

  it.each([123, null, ["GIAM50K"], { code: "GIAM50K" }])(
    "từ chối couponCode sai kiểu %j",
    (couponCode) => {
      expect(placeOrderSchema.safeParse({ ...validOrder, couponCode }).success).toBe(false);
    },
  );

  it("loại bỏ các trường tiền do client tự điền", () => {
    const parsed = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: "GIAM50K",
      discount: { code: "GIAM50K", amount: 999_999 },
      discountAmount: 999_999,
      total: 1,
      items: [{ productId: "p001", quantity: 1, unitPrice: 1 }],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("discount");
    expect(parsed.data).not.toHaveProperty("discountAmount");
    expect(parsed.data).not.toHaveProperty("total");
    expect(parsed.data?.items[0]).not.toHaveProperty("unitPrice");
  });
});

describe("couponCodeInputSchema", () => {
  it.each(["", "   "])("báo lỗi khi nhập %j", (value) => {
    const result = couponCodeInputSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Vui lòng nhập mã giảm giá");
  });

  it("báo lỗi khi dài hơn 32 ký tự", () => {
    const result = couponCodeInputSchema.safeParse("A".repeat(33));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Mã giảm giá tối đa 32 ký tự");
  });

  it("chấp nhận đúng 32 ký tự và giữ khoảng trắng ở giữa", () => {
    expect(couponCodeInputSchema.safeParse("A".repeat(32)).success).toBe(true);
    expect(couponCodeInputSchema.parse(" shop lite10 ")).toBe("shop lite10");
  });
});
