# Data Model: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

Mọi số tiền là số nguyên VND.

## 1. CouponDefinition (mới, `src/features/coupons/types.ts`)

Dữ liệu tĩnh trong `src/data/coupons.ts`, read-only, giống `products.ts`.

| Trường        | Kiểu                    | Bắt buộc          | Ràng buộc                                                                    |
| ------------- | ----------------------- | ----------------- | ---------------------------------------------------------------------------- |
| `code`        | `string`                | ✔                 | Chữ HOA, không khoảng trắng, duy nhất trong danh sách                        |
| `type`        | `"percent" \| "fixed"`  | ✔                 |                                                                              |
| `value`       | `number`                | ✔                 | `percent`: số nguyên 1–100; `fixed`: số tiền > 0                             |
| `maxDiscount` | `number`                | chỉ khi `percent` | > 0. Bắt buộc với `percent`, không có với `fixed` (discriminated union)      |
| `minSubtotal` | `number`                | —                 | ≥ 0; thiếu = không có ngưỡng                                                 |
| `expiresOn`   | `string` (`YYYY-MM-DD`) | —                 | Hiệu lực đến 23:59:59.999 giờ VN (+07:00) của ngày đó; thiếu = không hết hạn |

Type gợi ý:

```ts
type CouponDefinition =
  | {
      code: string;
      type: "percent";
      value: number;
      maxDiscount: number;
      minSubtotal?: number;
      expiresOn?: string;
    }
  | {
      code: string;
      type: "fixed";
      value: number;
      minSubtotal?: number;
      expiresOn?: string;
    };
```

Dữ liệu ban đầu (FR-022):

| code         | type    | value  | maxDiscount | minSubtotal | expiresOn    |
| ------------ | ------- | ------ | ----------- | ----------- | ------------ |
| `SHOPLITE10` | percent | 10     | 100_000     | 300_000     | —            |
| `GIAM50K`    | fixed   | 50_000 | —           | 500_000     | —            |
| `TET2026`    | percent | 15     | 200_000     | —           | `2026-02-28` |

## 2. CouponEvaluation (mới, giá trị trả về, không lưu)

Kết quả của `evaluateCoupon(coupon | undefined, subtotal, now)`:

```ts
type CouponEvaluation =
  | { ok: true; coupon: CouponDefinition; discount: number }
  | { ok: false; reason: "COUPON_NOT_FOUND" }
  | { ok: false; reason: "COUPON_EXPIRED"; coupon: CouponDefinition }
  | {
      ok: false;
      reason: "COUPON_MIN_SUBTOTAL_NOT_MET";
      coupon: CouponDefinition;
      minSubtotal: number;
      shortfall: number;
    };
```

Quy tắc, kiểm tra theo thứ tự (FR-014):

1. `coupon` không có → `COUPON_NOT_FOUND`.
2. `expiresOn` có và `now > expiryInstant` → `COUPON_EXPIRED`.
3. `minSubtotal` có và `subtotal < minSubtotal` → `COUPON_MIN_SUBTOTAL_NOT_MET`, `shortfall = minSubtotal − subtotal`.
4. Còn lại: `discount = min(raw, subtotal)`, với `raw = fixed ? value : min(floor(subtotal × value / 100), maxDiscount)`.

`evaluateCouponThreshold(coupon, subtotal)`: chỉ chạy bước 3–4 (ngưỡng, tính tiền), **không xét hạn dùng**. Client dùng hàm này; hạn dùng chỉ được kiểm tra ở server theo giờ server (`/api/coupons/validate` và `placeOrder`). `evaluateCoupon` = `checkCouponAvailability` (bước 1–2) + `evaluateCouponThreshold` (bước 3–4).

Thông báo tiếng Việt (`couponErrorMessage`):

| reason                        | Thông báo                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `COUPON_NOT_FOUND`            | "Mã giảm giá không tồn tại"                                                                                               |
| `COUPON_EXPIRED`              | "Mã giảm giá đã hết hạn"                                                                                                  |
| `COUPON_MIN_SUBTOTAL_NOT_MET` | "Đơn hàng chưa đạt giá trị tối thiểu {formatCurrency(minSubtotal)}. Mua thêm {formatCurrency(shortfall)} để dùng mã này." |
| (ô trống — validate Zod)      | "Vui lòng nhập mã giảm giá"                                                                                               |

## 3. OrderTotals (sửa, `src/features/checkout/pricing.ts`)

| Trường        | Trước                                    | Sau                                                          |
| ------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `subtotal`    | Σ unitPrice × quantity                   | không đổi                                                    |
| `discount`    | —                                        | **mới**: tham số đầu vào, kẹp vào `[0, subtotal]`            |
| `shippingFee` | `calculateShippingFee(subtotal, method)` | `calculateShippingFee(subtotal − discount, method)` (FR-012) |
| `total`       | subtotal + shippingFee                   | `subtotal − discount + shippingFee`                          |

`calculateOrderTotals(lines, method, discount = 0)`: với `discount = 0`, kết quả giống hệt hiện tại.

## 4. Order (sửa, `src/features/orders/types.ts`)

Thêm hai trường **optional** để đơn cũ trong `storage/orders.json` vẫn hợp lệ:

| Trường      | Kiểu                                 | Ghi chú                                                              |
| ----------- | ------------------------------------ | -------------------------------------------------------------------- |
| `discount?` | `number`                             | Đơn mới luôn ghi (0 nếu không dùng mã). Đơn cũ: thiếu, đọc là `?? 0` |
| `coupon?`   | `{ code: string; discount: number }` | Snapshot lúc đặt (FR-019); chỉ có khi đơn dùng mã                    |

Bất biến với đơn mới: `total === subtotal − (discount ?? 0) + shippingFee`; nếu có `coupon` thì `coupon.discount === discount > 0`.

`OrderRepository` không đổi interface; JSON được ghi và đọc nguyên vẹn.

## 5. PlaceOrderInput (sửa, `src/features/checkout/checkout-schema.ts`)

Thêm `couponCode: z.string().trim().max(32).optional()`. Chuỗi rỗng sau trim được coi như không có mã. **Không** thêm trường tiền nào. Zod tiếp tục loại bỏ các khóa lạ như `discount`, `total` (FR-016).

Schema mới cho endpoint kiểm tra mã: `validateCouponSchema = z.object({ code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá").max(32) })`.

## 6. Trạng thái mã ở trang thanh toán (client; chỉ chuỗi mã được giữ trong phiên — FR-023)

State React `appliedCoupon: CouponDefinition | null`. Chuỗi mã (không có tiền) được lưu ở `sessionStorage["shoplite:coupon"]`: ghi khi áp thành công, xóa khi gỡ mã, khi đặt hàng 201, hoặc khi khôi phục thất bại.

```text
  Mở trang + có mã trong phiên ──▶ gọi /api/coupons/validate
     ├─ 200, tạm tính ≥ ngưỡng ──▶ [Đang áp dụng]
     ├─ 200, tạm tính < ngưỡng ──▶ [Tạm ngưng]      (không từ chối như lúc áp mới)
     └─ 422 (không tồn tại / hết hạn) ──▶ [Trống + lỗi], xóa mã khỏi phiên


            Áp dụng (API ok + đạt ngưỡng)
  [Trống] ───────────────────────────────▶ [Đang áp dụng] ◀──┐
     ▲  │ Áp dụng thất bại: báo lỗi, ở lại          │ tạm tính < ngưỡng │ tạm tính ≥ ngưỡng
     │  ▼                                           ▼                   │
     │ [Trống + lỗi]                          [Tạm ngưng] ──────────────┘
     │                                              │
     └──────────── Gỡ mã (từ bất kỳ trạng thái nào có mã) ┘
  Đặt hàng: Đang áp dụng → gửi couponCode; Tạm ngưng → chặn ở client;
  Server trả COUPON_* → giữ mã, hiện lỗi cạnh ô mã (Q1 = B).
```
