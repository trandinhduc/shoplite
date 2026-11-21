# Security Checklist – Coupon Code Implementation

## 1️⃣ Server‑side Validation (Never trust client data)
- All coupon validation is performed **server‑side** in `couponService.validateCoupon`.
- Both the **preview endpoint** (`POST /api/orders/preview`) and the **order creation endpoint** (`POST /api/orders`) call this function to compute `discountAmount`.
- The server never trusts any `discountAmount`, `subtotal` or `couponCode` values sent from the client; they are recomputed.
- Errors are returned as `OrderError("INVALID_COUPON", …)` with HTTP 422.

## 2️⃣ Coupon Validity Checks
| Check | Description | Location |
|-------|-------------|----------|
| **Coupon exists** | `findCoupon` returns a coupon object; otherwise error `COUPON_NOT_FOUND`. | `couponService.validateCoupon` |
| **Expiration** | `now > expiresAt` → error `COUPON_EXPIRED`. | `couponService.validateCoupon` |
| **Minimum order value** | `subtotal >= minOrderValue`; if not, return `COUPON_MIN_ORDER_NOT_MET` with `amountNeeded`. | `couponService.validateCoupon` |
| **Percentage cap** | For `%` coupons, `discount = Math.min(percent * subtotal, maxDiscount)`. | `calculateDiscountAmount` |
| **Non‑negative total** | Ensure `subtotal - discount >= 0`. | `calculateOrderTotals` |
| **Single coupon per order** | API accepts only one `couponCode`. | `orderService.placeOrder` |

## 3️⃣ Anti‑Fraud Measures
- **Re‑validate** coupon at order creation even after preview.
- **Never store** `discountAmount` supplied by the client; always compute server‑side and persist the calculated value.
- **Subtotal change detection** – if `items` differ from preview, discount is recomputed based on the new subtotal.
- **Rate limiting** – limit calls to `/api/orders/preview` (e.g., ≤ 10 requests per minute per user/IP).
- **Audit logging** – log every failed coupon validation with `userId`, `code`, `reason`, and timestamp for monitoring.

## 4️⃣ Input Sanitization & Type Safety (Zod schemas)
```ts
// checkout-schema.ts
export const placeOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  couponCode: z.string().trim().toUpperCase().optional(),
});
```
- The same schema is used for the preview request (`checkoutPreview.ts`).
- Payload size is limited (e.g., 1 MB) to prevent DoS.
- All string values are escaped before logging or sending back to the client.

## 5️⃣ Access Control & Data Exposure
- The preview endpoint is public but **does not expose the list of coupons** – it only returns the calculated result.
- Order detail endpoint (`GET /api/orders/[id]`) includes `couponCode` and `discountAmount` **only for the owner of the order**.
- No internal coupon configuration (e.g., `maxDiscount`) is ever sent to the client.

## 6️⃣ Security‑Focused Tests
- **Unit tests** for every branch of `validateCoupon` (not found, expired, min‑order not met, percentage cap, fixed amount).
- **Unit test** for `calculateOrderTotals` confirming that `discountAmount` is derived from server logic, not client input.
- **E2E (Playwright)** scenarios:
  1. Apply a valid coupon, then modify cart items so subtotal falls below `minOrderValue` and attempt to place the order – expect `INVALID_COUPON`.
  2. Send a request with a fabricated `discountAmount` – server should ignore it and return the correct calculation.
  3. Attempt to use a non‑existent or expired coupon – UI should show the proper Vietnamese error message.
- **Fuzz testing**: send malformed JSON, negative quantities, overly long strings, and verify Zod rejects the request.

## 7️⃣ Monitoring & Incident Response
- **Metrics**: `order_invalid_coupon_total`, `order_invalid_coupon_rate`.
- **Alert**: trigger when error rate > 5 % within a 5‑minute window or when preview request volume exceeds the rate‑limit.
- **Throttle**: temporarily block IPs that exceed limits (e.g., 30 s block).
- **Logging**: include user identifier, coupon code, and failure reason for forensic analysis.

---

*All messages shown to the user are in Vietnamese as required by the project specification.*
