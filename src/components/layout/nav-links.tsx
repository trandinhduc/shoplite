"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/orders", label: "Đơn hàng" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm font-medium">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-lg px-2 py-2 whitespace-nowrap transition-colors sm:px-3",
            isActive(pathname, link.href)
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
