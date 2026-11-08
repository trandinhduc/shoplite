import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  couponCodeSchema,
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

const validOrderPayload = {
  customer: {
    fullName: "Nguyễn Văn A",
    phone: "0912345678",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p006", quantity: 2 }],
};

describe("couponCodeSchema", () => {
  it("bỏ khoảng trắng đầu cuối và chuyển thành chữ HOA", () => {
    expect(couponCodeSchema.parse(" shoplite10 ")).toBe("SHOPLITE10");
  });

  it("chấp nhận mã dài đúng 32 ký tự và từ chối 33 ký tự", () => {
    expect(couponCodeSchema.safeParse("a".repeat(32)).success).toBe(true);
    expect(couponCodeSchema.safeParse("a".repeat(33)).success).toBe(false);
  });

  it("độ dài tối đa được tính sau khi bỏ khoảng trắng đầu cuối", () => {
    expect(couponCodeSchema.safeParse(` ${"a".repeat(32)} `).success).toBe(true);
  });

  it.each([
    ["số", 123],
    ["mảng", ["SHOPLITE10"]],
    ["object", { code: "SHOPLITE10" }],
    ["null", null],
    ["undefined", undefined],
  ])("từ chối giá trị sai kiểu (%s)", (_label, value) => {
    expect(couponCodeSchema.safeParse(value).success).toBe(false);
  });

  it("không tự sửa khoảng trắng ở giữa mã", () => {
    expect(couponCodeSchema.parse("shop lite10")).toBe("SHOP LITE10");
  });
});

describe("placeOrderSchema - mã giảm giá", () => {
  it("couponCode là tùy chọn", () => {
    const result = placeOrderSchema.safeParse(validOrderPayload);
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("chuẩn hóa couponCode", () => {
    const result = placeOrderSchema.parse({
      ...validOrderPayload,
      couponCode: " giam50k ",
    });
    expect(result.couponCode).toBe("GIAM50K");
  });

  it("couponCode chỉ gồm khoảng trắng được coi như không có mã", () => {
    const result = placeOrderSchema.parse({
      ...validOrderPayload,
      couponCode: "   ",
    });
    expect(result.couponCode).toBeUndefined();
  });

  it("từ chối couponCode dài hơn 32 ký tự hoặc sai kiểu", () => {
    expect(
      placeOrderSchema.safeParse({
        ...validOrderPayload,
        couponCode: "A".repeat(33),
      }).success,
    ).toBe(false);
    expect(placeOrderSchema.safeParse({ ...validOrderPayload, couponCode: 5 }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...validOrderPayload, couponCode: null }).success).toBe(
      false,
    );
  });

  it("loại bỏ mọi trường tiền do client gửi lên", () => {
    const result = placeOrderSchema.parse({
      ...validOrderPayload,
      discount: 999_999,
      total: 1,
      subtotal: 1,
      shippingFee: 0,
    });
    expect(result).not.toHaveProperty("discount");
    expect(result).not.toHaveProperty("total");
    expect(result).not.toHaveProperty("subtotal");
    expect(result).not.toHaveProperty("shippingFee");
  });
});

describe("validateCouponSchema", () => {
  const items = [{ productId: "p006", quantity: 2 }];

  it("chấp nhận body hợp lệ và chuẩn hóa mã", () => {
    const result = validateCouponSchema.parse({ code: " shoplite10 ", items });
    expect(result).toEqual({ code: "SHOPLITE10", items });
  });

  it("từ chối mã chỉ gồm khoảng trắng hoặc rỗng", () => {
    expect(validateCouponSchema.safeParse({ code: "   ", items }).success).toBe(false);
    expect(validateCouponSchema.safeParse({ code: "", items }).success).toBe(false);
  });

  it("từ chối mã dài hơn 32 ký tự", () => {
    expect(validateCouponSchema.safeParse({ code: "A".repeat(33), items }).success).toBe(false);
  });

  it("dùng chung ràng buộc danh sách sản phẩm với đặt hàng", () => {
    expect(validateCouponSchema.safeParse({ code: "GIAM50K", items: [] }).success).toBe(false);
    expect(
      validateCouponSchema.safeParse({
        code: "GIAM50K",
        items: [{ productId: "p006", quantity: 11 }],
      }).success,
    ).toBe(false);
  });

  it("loại bỏ số tiền do client gửi lên", () => {
    const result = validateCouponSchema.parse({
      code: "GIAM50K",
      items,
      subtotal: 1,
    });
    expect(result).not.toHaveProperty("subtotal");
  });
});
