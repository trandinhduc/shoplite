import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  couponValidationSchema,
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

const validOrder = {
  customer: {
    fullName: "Nguyễn Văn A",
    phone: "0912345678",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 1 }],
};

describe("placeOrderSchema.couponCode", () => {
  it.each([undefined, "", " SHOPLITE10 "])("chấp nhận mã giảm giá %j", (couponCode) => {
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode }).success).toBe(true);
  });

  it("chuẩn hóa mã giảm giá trong payload đặt hàng", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: " ｓｈｏｐｌｉｔｅ１０ ",
    });
    expect(result.data?.couponCode).toBe("SHOPLITE10");
  });

  it.each(["A".repeat(33), 123, "SHOP LITE", "\u0000SHOP"])(
    "từ chối mã giảm giá %j với lỗi ở couponCode",
    (couponCode) => {
      const result = placeOrderSchema.safeParse({ ...validOrder, couponCode });
      expect(result.success).toBe(false);
      expect(Object.keys(toFieldErrors(result.error!))).toEqual(["couponCode"]);
    },
  );
});

describe("couponValidationSchema", () => {
  const items = [{ productId: "p010", quantity: 1 }];

  it("chấp nhận mã và danh sách sản phẩm hợp lệ, bỏ khoảng trắng hai đầu", () => {
    const result = couponValidationSchema.safeParse({ code: " giam50k ", items });
    expect(result.data?.code).toBe("GIAM50K");
  });

  it("báo cần nhập mã khi mã rỗng hoặc chỉ có khoảng trắng", () => {
    const result = couponValidationSchema.safeParse({ code: "   ", items });
    expect(toFieldErrors(result.error!)).toEqual({ code: "Vui lòng nhập mã giảm giá" });
  });

  it("từ chối mã dài hơn 32 ký tự", () => {
    expect(couponValidationSchema.safeParse({ code: "A".repeat(33), items }).success).toBe(false);
  });

  it.each(["GIAM 50K", "GIAM-50K", "<b>X</b>", "\u0007BELL"])(
    "từ chối mã có ký tự ngoài chữ và số: %j",
    (code) => {
      const result = couponValidationSchema.safeParse({ code, items });
      expect(toFieldErrors(result.error!)).toEqual({ code: "Mã giảm giá chỉ gồm chữ và số" });
    },
  );

  it("giới hạn tối đa 50 dòng sản phẩm mỗi lần kiểm tra mã", () => {
    const lines = (n: number) =>
      Array.from({ length: n }, () => ({ productId: "p010", quantity: 1 }));
    expect(couponValidationSchema.safeParse({ code: "GIAM50K", items: lines(50) }).success).toBe(
      true,
    );
    expect(couponValidationSchema.safeParse({ code: "GIAM50K", items: lines(51) }).success).toBe(
      false,
    );
  });

  it("dùng cùng quy tắc với items của đơn hàng", () => {
    const result = couponValidationSchema.safeParse({
      code: "GIAM50K",
      items: [{ productId: "p010", quantity: 11 }],
    });
    expect(result.success).toBe(false);
  });
});
