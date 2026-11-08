"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Banknote, CreditCard, Truck, Zap } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart } from "@/features/cart/use-cart";
import {
  checkoutFormSchema,
  PAYMENT_METHODS,
  PAYMENT_OPTIONS,
  toFieldErrors,
  type CheckoutFormValues,
  type PaymentMethod,
} from "@/features/checkout/checkout-schema";
import {
  calculateShippingFee,
  SHIPPING_METHODS,
  SHIPPING_OPTIONS,
  type ShippingMethod,
} from "@/features/checkout/pricing";
import { CouponField } from "@/features/coupons/components/coupon-field";
// Chỉ import logic thuần - KHÔNG import coupon-catalog / src/data/coupons.ts từ client.
import { validateCouponSchema } from "@/features/coupons/coupon-schema";
import { couponErrorMessage, evaluateCouponThreshold } from "@/features/coupons/coupon-service";
import type { CouponDefinition } from "@/features/coupons/types";
import type { ApiErrorBody } from "@/lib/http";
import type { Order } from "@/features/orders/types";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { CheckoutSummary } from "./checkout-summary";

const INITIAL_VALUES: CheckoutFormValues = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  note: "",
  shippingMethod: "standard",
  paymentMethod: "cod",
};

const SHIPPING_ICONS: Record<ShippingMethod, ReactNode> = {
  standard: <Truck className="size-5" />,
  express: <Zap className="size-5" />,
};

const PAYMENT_ICONS: Record<PaymentMethod, ReactNode> = {
  cod: <Banknote className="size-5" />,
  bank_transfer: <CreditCard className="size-5" />,
};

const inputClass =
  "h-11 w-full rounded-xl border-0 bg-white px-3 text-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none";

const COUPON_NETWORK_ERROR = "Không kiểm tra được mã giảm giá, vui lòng thử lại.";

/**
 * Giữ mã đã áp trong phiên trình duyệt (FR-023). CHỈ lưu chuỗi mã, không lưu tiền;
 * mã luôn được kiểm tra lại qua /api/coupons/validate khi mở trang và khi đặt hàng.
 */
const COUPON_SESSION_KEY = "shoplite:coupon";

function readStoredCouponCode(): string | null {
  try {
    return window.sessionStorage.getItem(COUPON_SESSION_KEY);
  } catch {
    return null;
  }
}

function storeCouponCode(code: string | null) {
  try {
    if (code) window.sessionStorage.setItem(COUPON_SESSION_KEY, code);
    else window.sessionStorage.removeItem(COUPON_SESSION_KEY);
  } catch {
    // sessionStorage không dùng được (chế độ riêng tư...) - bỏ qua, trang vẫn chạy.
  }
}

/** Gọi POST /api/coupons/validate; trả về mã hợp lệ hoặc thông báo lỗi tiếng Việt. */
async function requestCouponValidation(
  code: string,
): Promise<{ coupon: CouponDefinition } | { error: string; invalid: boolean }> {
  try {
    const response = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
      return {
        error: body?.error.message ?? COUPON_NETWORK_ERROR,
        invalid: Boolean(body),
      };
    }
    return (await response.json()) as { coupon: CouponDefinition };
  } catch {
    return { error: COUPON_NETWORK_ERROR, invalid: false };
  }
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, hydrated, clear } = useCart();
  const [values, setValues] = useState<CheckoutFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "redirecting">("idle");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDefinition | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Tính lại mỗi lần render theo tạm tính hiện tại. Client KHÔNG xét hạn dùng
  // bằng giờ máy khách - hạn dùng do server kiểm tra (validate + đặt hàng).
  const couponEvaluation = appliedCoupon ? evaluateCouponThreshold(appliedCoupon, subtotal) : null;
  const discount = couponEvaluation?.ok ? couponEvaluation.discount : 0;

  // Khôi phục mã đã áp trong phiên: kiểm tra lại với server. Dưới ngưỡng thì
  // giữ ở trạng thái tạm ngưng (không từ chối như lúc áp mới); mã không còn
  // tồn tại / hết hạn thì bỏ và báo lý do (FR-023).
  useEffect(() => {
    const storedCode = readStoredCouponCode();
    if (!storedCode) return;
    let cancelled = false;
    void requestCouponValidation(storedCode).then((result) => {
      if (cancelled) return;
      if ("coupon" in result) {
        setAppliedCoupon(result.coupon);
        return;
      }
      if (result.invalid) storeCouponCode(null);
      setCouponError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />;
  }

  if (status === "redirecting") {
    return (
      <p className="py-16 text-center text-slate-600">Đặt hàng thành công, đang chuyển trang…</p>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🧾"
        title="Chưa có sản phẩm để thanh toán"
        description="Giỏ hàng của bạn đang trống."
        action={
          <Link href="/products" className={buttonStyles()}>
            Xem sản phẩm
          </Link>
        }
      />
    );
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleApplyCoupon(code: string) {
    // Validate ở client chỉ để trải nghiệm; server validate lại bằng cùng schema.
    const parsed = validateCouponSchema.safeParse({ code });
    if (!parsed.success) {
      setCouponError(toFieldErrors(parsed.error).code ?? "Mã giảm giá không hợp lệ");
      return;
    }

    setCouponPending(true);
    try {
      const result = await requestCouponValidation(parsed.data.code);
      // Thất bại → báo lỗi và GIỮ mã cũ nếu có (FR-005).
      if (!("coupon" in result)) {
        setCouponError(result.error);
        return;
      }
      // Áp mới mà chưa đạt ngưỡng → từ chối, không lưu mã (US2 kịch bản 3).
      const threshold = evaluateCouponThreshold(result.coupon, subtotal);
      if (!threshold.ok) {
        setCouponError(couponErrorMessage(threshold));
        return;
      }
      // Thành công → thay mã cũ, mỗi đơn chỉ một mã.
      setAppliedCoupon(result.coupon);
      setCouponError(null);
      storeCouponCode(result.coupon.code);
    } finally {
      setCouponPending(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
    storeCouponCode(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = checkoutFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    // Mã đang tạm ngưng (dưới ngưỡng) → chặn đặt hàng; thông báo cần mua thêm
    // đang hiển thị cạnh ô mã. Server cũng sẽ từ chối nếu bị gọi thẳng.
    if (couponEvaluation && !couponEvaluation.ok) {
      document.getElementById("couponCode")?.focus();
      return;
    }

    const { shippingMethod, paymentMethod, ...customer } = parsed.data;
    setStatus("submitting");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          shippingMethod,
          paymentMethod,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          // Chỉ gửi mã, không gửi số tiền - server tự tính lại.
          couponCode: couponEvaluation?.ok ? couponEvaluation.coupon.code : undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        if (body?.error.code.startsWith("COUPON_")) {
          // Lỗi mã: hiện cạnh ô mã và GIỮ mã trên trang (không tự gỡ - Q1).
          setCouponError(body.error.message);
        } else {
          setSubmitError(body?.error.message ?? "Không thể đặt hàng, vui lòng thử lại.");
        }
        setStatus("idle");
        return;
      }

      const order = (await response.json()) as Order;
      setStatus("redirecting");
      storeCouponCode(null);
      clear();
      router.push(`/orders/${order.id}?placed=1`);
    } catch {
      setSubmitError("Không kết nối được máy chủ, vui lòng thử lại.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold">Thông tin nhận hàng</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" name="fullName" error={errors.fullName} required>
              <input
                id="fullName"
                name="fullName"
                value={values.fullName}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                aria-invalid={Boolean(errors.fullName)}
                className={cn(inputClass, errors.fullName ? "ring-rose-400" : "ring-slate-300")}
              />
            </Field>
            <Field label="Số điện thoại" name="phone" error={errors.phone} required>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={values.phone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="0912345678"
                aria-invalid={Boolean(errors.phone)}
                className={cn(inputClass, errors.phone ? "ring-rose-400" : "ring-slate-300")}
              />
            </Field>
            <Field label="Email" name="email" error={errors.email} className="sm:col-span-2">
              <input
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="ban@example.com (không bắt buộc)"
                aria-invalid={Boolean(errors.email)}
                className={cn(inputClass, errors.email ? "ring-rose-400" : "ring-slate-300")}
              />
            </Field>
            <Field
              label="Địa chỉ giao hàng"
              name="address"
              error={errors.address}
              required
              className="sm:col-span-2"
            >
              <input
                id="address"
                name="address"
                value={values.address}
                onChange={handleChange}
                autoComplete="street-address"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                aria-invalid={Boolean(errors.address)}
                className={cn(inputClass, errors.address ? "ring-rose-400" : "ring-slate-300")}
              />
            </Field>
            <Field label="Ghi chú" name="note" error={errors.note} className="sm:col-span-2">
              <textarea
                id="note"
                name="note"
                rows={2}
                value={values.note}
                onChange={handleChange}
                placeholder="Ví dụ: giao giờ hành chính"
                className={cn(
                  inputClass,
                  "h-auto py-2",
                  errors.note ? "ring-rose-400" : "ring-slate-300",
                )}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold">Phương thức giao hàng</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHIPPING_METHODS.map((method) => {
              // Ngưỡng miễn ship xét trên tạm tính sau giảm, khớp với tóm tắt (FR-012).
              const fee = calculateShippingFee(subtotal - discount, method);
              return (
                <OptionCard
                  key={method}
                  name="shippingMethod"
                  value={method}
                  checked={values.shippingMethod === method}
                  onChange={() =>
                    setValues((current) => ({
                      ...current,
                      shippingMethod: method,
                    }))
                  }
                  icon={SHIPPING_ICONS[method]}
                  title={SHIPPING_OPTIONS[method].label}
                  description={`${SHIPPING_OPTIONS[method].description} · ${fee === 0 ? "Miễn phí" : formatCurrency(fee)}`}
                />
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold">Phương thức thanh toán</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_METHODS.map((method) => (
              <OptionCard
                key={method}
                name="paymentMethod"
                value={method}
                checked={values.paymentMethod === method}
                onChange={() =>
                  setValues((current) => ({
                    ...current,
                    paymentMethod: method,
                  }))
                }
                icon={PAYMENT_ICONS[method]}
                title={PAYMENT_OPTIONS[method].label}
                description={PAYMENT_OPTIONS[method].description}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <CouponField
          pending={couponPending}
          onApply={handleApplyCoupon}
          error={couponError}
          appliedCode={appliedCoupon?.code}
          evaluation={couponEvaluation}
          onRemove={handleRemoveCoupon}
        />
        <CheckoutSummary
          items={items}
          shippingMethod={values.shippingMethod}
          discount={discount}
          couponCode={appliedCoupon?.code}
        />
        {submitError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={status !== "idle"}>
          {status === "submitting" ? "Đang đặt hàng…" : "Đặt hàng"}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

function Field({ label, name, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-rose-600" data-testid={`error-${name}`}>
          {error}
        </p>
      )}
    </div>
  );
}

interface OptionCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}

function OptionCard({ name, value, checked, onChange, icon, title, description }: OptionCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition ring-inset",
        checked
          ? "bg-indigo-50 ring-2 ring-indigo-600"
          : "bg-white ring-slate-200 hover:bg-slate-50",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className={checked ? "text-indigo-600" : "text-slate-400"}>{icon}</span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <span className="text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}
