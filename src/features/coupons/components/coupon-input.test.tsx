import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CouponInput } from "./coupon-input";
import type { AppliedCoupon } from "../types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CouponInput Component", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("render ô nhập mã và nút Áp dụng khi chưa có mã", () => {
    render(
      <CouponInput
        appliedCoupon={null}
        subtotal={1_290_000}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Mã giảm giá/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Áp dụng/i })).toBeInTheDocument();
  });

  it("gọi API /api/coupons/validate và trigger onApply khi mã hợp lệ", async () => {
    const handleApply = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        coupon: {
          code: "SHOPLITE10",
          type: "percentage",
          value: 10,
          description: "Giảm 10%",
        },
        discountAmount: 100_000,
      }),
    });

    render(
      <CouponInput
        appliedCoupon={null}
        subtotal={1_290_000}
        onApply={handleApply}
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByLabelText(/Mã giảm giá/i);
    fireEvent.change(input, { target: { value: "SHOPLITE10" } });
    fireEvent.click(screen.getByRole("button", { name: /Áp dụng/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/coupons/validate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "SHOPLITE10", subtotal: 1_290_000 }),
        }),
      );
      expect(handleApply).toHaveBeenCalledWith({
        code: "SHOPLITE10",
        discountAmount: 100_000,
        description: "Giảm 10%",
      });
    });
  });

  it("hiển thị mã đã áp dụng và nút Gỡ bỏ khi appliedCoupon khác null", () => {
    const applied: AppliedCoupon = {
      code: "SHOPLITE10",
      discountAmount: 100_000,
      description: "Giảm 10%",
    };
    const handleRemove = vi.fn();

    render(
      <CouponInput
        appliedCoupon={applied}
        subtotal={1_290_000}
        onApply={vi.fn()}
        onRemove={handleRemove}
      />,
    );

    expect(screen.getByText("SHOPLITE10")).toBeInTheDocument();
    const removeButton = screen.getByRole("button", { name: /Gỡ/i });
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(handleRemove).toHaveBeenCalled();
  });

  it("hiển thị thông báo lỗi và aria-invalid khi API trả về lỗi", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: "COUPON_NOT_FOUND",
          message: "Mã giảm giá không tồn tại",
        },
      }),
    });

    render(
      <CouponInput
        appliedCoupon={null}
        subtotal={500_000}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const input = screen.getByLabelText(/Mã giảm giá/i);
    fireEvent.change(input, { target: { value: "KHONGTONTAI" } });
    fireEvent.click(screen.getByRole("button", { name: /Áp dụng/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Mã giảm giá không tồn tại");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("hiển thị trạng thái [đã hết hạn] khi isExpiredAtOrder=true", () => {
    const applied: AppliedCoupon = {
      code: "TET2026",
      discountAmount: 100_000,
      description: "Tết",
    };

    render(
      <CouponInput
        appliedCoupon={applied}
        subtotal={1_000_000}
        onApply={vi.fn()}
        onRemove={vi.fn()}
        isExpiredAtOrder={true}
      />,
    );

    expect(screen.getByText(/\[đã hết hạn\]/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gỡ/i })).toBeInTheDocument();
  });
});
