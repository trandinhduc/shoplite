import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/features/checkout/pricing";

const PERKS = [
  { icon: Truck, text: `Miễn phí giao hàng cho đơn từ ${formatCurrency(FREE_SHIPPING_THRESHOLD)}` },
  { icon: ShieldCheck, text: "Hàng chính hãng, bảo hành 12 tháng" },
  { icon: RotateCcw, text: "Đổi trả miễn phí trong 7 ngày" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-sm text-slate-600">
            <Icon className="size-5 shrink-0 text-indigo-600" />
            {text}
          </div>
        ))}
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ShopLite - Dự án mẫu phục vụ học tập. Không bán hàng thật.
      </p>
    </footer>
  );
}
