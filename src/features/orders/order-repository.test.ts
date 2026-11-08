// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  customer: {
    fullName: "Lê Văn C",
    phone: "0901234567",
    address: "1 Trần Phú, Hà Đông, Hà Nội",
  },
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

  it("lưu và đọc lại nguyên vẹn discount và snapshot coupon", async () => {
    const repository = createJsonFileOrderRepository(file);
    const order: Order = {
      ...sampleOrder("SL-2"),
      subtotal: 600_000,
      discount: 50_000,
      coupon: { code: "GIAM50K", discount: 50_000 },
      total: 550_000,
    };
    await repository.save(order);

    expect(await repository.findById("SL-2")).toEqual(order);
    expect(await repository.findAll()).toEqual([order]);
  });

  it("đọc được đơn cũ trong file JSON không có discount/coupon", async () => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify([sampleOrder("SL-OLD")]), "utf8");
    const repository = createJsonFileOrderRepository(file);

    const order = await repository.findById("SL-OLD");
    expect(order).toMatchObject({ id: "SL-OLD", total: 0 });
    expect(order).not.toHaveProperty("discount");
    expect(order).not.toHaveProperty("coupon");
  });
});
