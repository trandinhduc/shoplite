"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiErrorBody } from "@/lib/http";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelOrder() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setPending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
      setError(body?.error.message ?? "Không thể hủy đơn hàng");
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Hủy đơn hàng
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-rose-50 p-4 text-sm">
      <p className="font-medium text-rose-900">Bạn chắc chắn muốn hủy đơn hàng này?</p>
      <div className="flex gap-2">
        <Button variant="danger" size="sm" onClick={cancelOrder} disabled={pending}>
          {pending ? "Đang hủy…" : "Xác nhận hủy"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Không
        </Button>
      </div>
      {error && <p className="text-rose-700">{error}</p>}
    </div>
  );
}
