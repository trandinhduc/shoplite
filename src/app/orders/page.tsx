import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { orderService } from "@/features/orders/server";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Đơn hàng" };

// Đọc dữ liệu đơn hàng mới nhất ở mỗi request (không prerender lúc build).
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await orderService.listOrders();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Đơn hàng của bạn</h1>

      {orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Bạn chưa có đơn hàng nào"
          description="Các đơn hàng sau khi đặt sẽ hiển thị tại đây."
          action={
            <Link href="/products" className={buttonStyles()}>
              Bắt đầu mua sắm
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
                  data-testid="order-row"
                >
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item) => (
                      <span
                        key={item.productId}
                        className="flex size-11 items-center justify-center rounded-full text-xl ring-2 ring-white"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${item.image.from}, ${item.image.to})`,
                        }}
                        aria-hidden
                      >
                        {item.image.emoji}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <span className="text-sm text-slate-500">
                      {formatDateTime(order.createdAt)} · {itemCount} sản phẩm
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(order.total)}</span>
                  <ChevronRight className="size-5 text-slate-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
