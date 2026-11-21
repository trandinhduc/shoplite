---
paths:
  - "src/**/*.test.{ts,tsx}"
  - "e2e/**/*.ts"
---

# Quy tắc viết test

- Tên test (`it(...)`) viết bằng tiếng Việt, mô tả hành vi: `it("miễn phí giao hàng khi đơn đạt ngưỡng")`.
- Mỗi quy tắc nghiệp vụ có ít nhất 1 test cho giá trị biên (ngay dưới / đúng bằng / ngay trên ngưỡng).
- Component test: truy vấn theo vai trò (`getByRole`, `getByLabelText`) trước, `getByTestId` sau cùng.
- Không gọi mạng thật: dùng `vi.stubGlobal("fetch", ...)`; mock `next/navigation` khi component dùng router.
- Test liên quan đơn hàng dùng `createInMemoryOrderRepository()` và truyền `now`/`generateId` cố định.
- E2E (Playwright) scope locator vào vùng cụ thể (`getByTestId("purchase-panel")`) để tránh trùng nút.
