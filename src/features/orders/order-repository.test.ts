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

  it("đọc được đơn JSON cũ không có discount, không lỗi và không thêm khóa", async () => {
    const legacy = sampleOrder("SL-OLD");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify([legacy]), "utf8");

    const repository = createJsonFileOrderRepository(file);
    const loaded = await repository.findById("SL-OLD");

    expect(loaded).toEqual(legacy);
    expect(loaded).not.toHaveProperty("discount");
  });

  it("ghi rồi đọc lại đơn có discount giữ nguyên code và amount", async () => {
    const repository = createJsonFileOrderRepository(file);
    await repository.save({
      ...sampleOrder("SL-DISC"),
      discount: { code: "GIAM50K", amount: 50_000 },
    });

    expect((await repository.findById("SL-DISC"))?.discount).toEqual({
      code: "GIAM50K",
      amount: 50_000,
    });
  });

  it("lưu đơn mới không làm đổi đơn cũ chưa có discount", async () => {
    const legacy = sampleOrder("SL-OLD");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify([legacy]), "utf8");

    const repository = createJsonFileOrderRepository(file);
    await repository.save({
      ...sampleOrder("SL-NEW"),
      discount: { code: "SHOPLITE10", amount: 1 },
    });

    expect(await repository.findById("SL-OLD")).toEqual(legacy);
  });
});
