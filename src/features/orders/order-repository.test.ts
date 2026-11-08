// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createJsonFileOrderRepository } from "./order-repository";
import type { Order } from "./types";

const sampleOrder = (id: string): Order => ({
  id,
  status: "pending",
  createdAt: "2026-10-21T03:00:00.000Z",
  updatedAt: "2026-10-21T03:00:00.000Z",
  customer: { fullName: "Lê Văn C", phone: "0901234567", address: "1 Trần Phú, Hà Đông, Hà Nội" },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [],
  subtotal: 0,
  shippingFee: 0,
  total: 0,
});

describe("createJsonFileOrderRepository", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "shoplite-orders-"));
    file = path.join(dir, "nested", "orders.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("trả về danh sách rỗng khi file chưa tồn tại", async () => {
    const repository = createJsonFileOrderRepository(file);
    expect(await repository.findAll()).toEqual([]);
    expect(await repository.findById("SL-1")).toBeNull();
  });

  it("tạo thư mục, ghi file và đọc lại được", async () => {
    const repository = createJsonFileOrderRepository(file);
    await repository.save(sampleOrder("SL-1"));

    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw).toHaveLength(1);
    expect(await repository.findById("SL-1")).toMatchObject({ id: "SL-1" });
  });

  it("cập nhật đơn hàng đã tồn tại thay vì thêm bản sao", async () => {
    const repository = createJsonFileOrderRepository(file);
    await repository.save(sampleOrder("SL-1"));
    await repository.save({ ...sampleOrder("SL-1"), status: "cancelled" });

    const orders = await repository.findAll();
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("cancelled");
  });
});

describe("createJsonFileOrderRepository - đơn tạo trước tính năng mã giảm giá", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "shoplite-orders-"));
    file = path.join(dir, "orders.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("đọc được đơn cũ không có couponCode và discount, giữ nguyên total", async () => {
    const donCu = {
      ...sampleOrder("SL-CU"),
      subtotal: 350_000,
      shippingFee: 30_000,
      total: 380_000,
    };
    expect(donCu).not.toHaveProperty("discount");
    expect(donCu).not.toHaveProperty("couponCode");
    await writeFile(file, JSON.stringify([donCu]), "utf8");

    const repository = createJsonFileOrderRepository(file);
    const byId = await repository.findById("SL-CU");
    expect(byId).toMatchObject({ id: "SL-CU", subtotal: 350_000, total: 380_000 });
    expect(byId?.discount).toBeUndefined();
    expect(byId?.couponCode).toBeUndefined();
    expect((await repository.findAll())[0].total).toBe(380_000);
  });

  it("ghi đơn mới có mã giảm giá cạnh đơn cũ mà không làm hỏng đơn cũ", async () => {
    await writeFile(file, JSON.stringify([sampleOrder("SL-CU")]), "utf8");
    const repository = createJsonFileOrderRepository(file);
    await repository.save({ ...sampleOrder("SL-MOI"), couponCode: "GIAM50K", discount: 50_000 });

    expect(await repository.findById("SL-MOI")).toMatchObject({
      couponCode: "GIAM50K",
      discount: 50_000,
    });
    expect(await repository.findById("SL-CU")).toMatchObject({ id: "SL-CU" });
  });
});
