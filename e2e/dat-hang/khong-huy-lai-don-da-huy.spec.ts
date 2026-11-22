// spec: specs/mua-hang.plan.md
// seed: e2e/seed.spec.ts
import { test, expect, createPendingOrder } from "../fixtures";

test.describe("Thanh toán và đơn hàng", () => {
  test("DH-3 đơn đã hủy không hủy lại được", { tag: "@DH-3" }, async ({ request }) => {
    // 1. Tạo đơn rồi hủy qua API: trả 200
    const orderId = await createPendingOrder(request);
    const first = await request.patch(`/api/orders/${orderId}`, { data: { status: "cancelled" } });
    expect(first.ok()).toBe(true);

    // 2. Hủy lần nữa: bị từ chối 409 với mã lỗi rõ ràng
    const second = await request.patch(`/api/orders/${orderId}`, { data: { status: "cancelled" } });
    expect(second.status()).toBe(409);
    expect(await second.json()).toMatchObject({ error: { code: "INVALID_STATUS_TRANSITION" } });
  });
});
