---
paths:
  - "src/**/*.test.{ts,tsx}"
  - "e2e/**/*.ts"
---

# Quy tắc viết test

- Tên test viết bằng tiếng Việt, mô tả hành vi: `it("miễn phí giao hàng khi đơn đạt ngưỡng")`.
- Mỗi quy tắc nghiệp vụ có ít nhất 1 test cho giá trị biên (dưới / bằng / trên ngưỡng).
- Component test: ưu tiên `getByRole`, `getByLabelText`; `getByTestId` là lựa chọn cuối.
- Không gọi mạng thật: dùng `vi.stubGlobal("fetch", ...)`.
