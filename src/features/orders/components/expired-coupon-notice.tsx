import { formatCurrency } from "@/lib/format";

interface ExpiredCouponNoticeProps {
  couponCode: string;
  /** Số tiền giảm mà mã lẽ ra mang lại cho đơn này (do server tính). */
  lostDiscount: number;
}

/** Báo cho khách biết mã đã hết hạn lúc đặt hàng nên đơn được tính theo giá gốc. */
export function ExpiredCouponNotice({ couponCode, lostDiscount }: ExpiredCouponNoticeProps) {
  return (
    <div
      role="status"
      className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      {`Mã ${couponCode} đã hết hạn lúc đặt hàng nên không được áp dụng. ` +
        `Đơn hàng được tính theo giá gốc (mã lẽ ra giảm ${formatCurrency(lostDiscount)}).`}
    </div>
  );
}
