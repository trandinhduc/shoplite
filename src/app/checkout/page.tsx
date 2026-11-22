import type { Metadata } from "next";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";

export const metadata: Metadata = { title: "Thanh toán" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Thanh toán</h1>
      <CheckoutForm />
    </div>
  );
}
