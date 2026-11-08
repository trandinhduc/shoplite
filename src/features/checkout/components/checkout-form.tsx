"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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
import { evaluateCoupon } from "@/features/coupons/coupon-rules";
import type { CouponRule } from "@/features/coupons/types";
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

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, hydrated, clear } = useCart();
  const [values, setValues] = useState<CheckoutFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "redirecting">("idle");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRule | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [submitBlocked, setSubmitBlocked] = useState(false);
  // Đánh giá lại mỗi lần render để theo kịp giỏ hàng; không xét hết hạn ở client (FR-021).
  const couponEvaluation = appliedCoupon ? evaluateCoupon(appliedCoupon, subtotal) : undefined;
  // Tính theo giỏ hiện tại: mua đủ thì câu báo tự biến mất, số tiền còn thiếu luôn đúng.
  const blockedMessage =
    submitBlocked && appliedCoupon && couponEvaluation?.status === "below_minimum"
      ? `Vui lòng mua thêm ${formatCurrency(couponEvaluation.shortfall)} hoặc gỡ mã ${appliedCoupon.code} để đặt hàng`
      : null;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = checkoutFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    // Mã đang "chưa đủ điều kiện": không gửi đơn, khách mua thêm hoặc gỡ mã (FR-017a).
    if (couponEvaluation?.status === "below_minimum") {
      setSubmitBlocked(true);
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
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          // Chỉ gửi mã; số tiền giảm và tổng tiền do server tự tính lại.
          ...(appliedCoupon && { couponCode: appliedCoupon.code }),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        if (body?.error.code.startsWith("COUPON_")) {
          // Mã không còn dùng được: gỡ mã để khách thấy tổng tiền mới, giữ nguyên thông tin đã nhập (FR-013).
          setAppliedCoupon(null);
          setCouponError(body.error.details?.couponCode ?? body.error.message);
        } else {
          setSubmitError(body?.error.message ?? "Không thể đặt hàng, vui lòng thử lại.");
        }
        setStatus("idle");
        return;
      }

      const order = (await response.json()) as Order;
      setStatus("redirecting");
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
              const fee = calculateShippingFee(subtotal, method);
              return (
                <OptionCard
                  key={method}
                  name="shippingMethod"
                  value={method}
                  checked={values.shippingMethod === method}
                  onChange={() => setValues((current) => ({ ...current, shippingMethod: method }))}
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
                onChange={() => setValues((current) => ({ ...current, paymentMethod: method }))}
                icon={PAYMENT_ICONS[method]}
                title={PAYMENT_OPTIONS[method].label}
                description={PAYMENT_OPTIONS[method].description}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <CheckoutSummary
          items={items}
          shippingMethod={values.shippingMethod}
          coupon={
            couponEvaluation && appliedCoupon
              ? { code: appliedCoupon.code, evaluation: couponEvaluation }
              : undefined
          }
        />
        <CouponField
          subtotal={subtotal}
          appliedCode={appliedCoupon?.code}
          evaluation={couponEvaluation}
          error={blockedMessage ?? couponError ?? undefined}
          onApplied={(rule) => {
            setAppliedCoupon(rule);
            setCouponError(null);
            setSubmitBlocked(false);
          }}
          onRemove={() => {
            setAppliedCoupon(null);
            setCouponError(null);
            setSubmitBlocked(false);
          }}
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
