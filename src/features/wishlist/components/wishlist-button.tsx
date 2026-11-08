"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWishlist } from "../use-wishlist";
import { WISHLIST_MAX_ITEMS } from "../wishlist-reducer";

/** Thời gian (ms) hiển thị lời nhắn "danh sách đã đầy". */
const FULL_MESSAGE_DURATION_MS = 4000;

const FULL_MESSAGE = `Danh sách yêu thích đã đầy (tối đa ${WISHLIST_MAX_ITEMS} sản phẩm). Hãy bỏ bớt sản phẩm để thêm mới.`;

interface WishlistButtonProps {
  productId: string;
  productName: string;
  size?: "sm" | "md";
  /** Dùng để định vị nút (ví dụ góc ảnh trên thẻ sản phẩm). */
  className?: string;
}

/**
 * Nút trái tim bật/tắt sản phẩm khỏi danh sách yêu thích.
 * Nhãn cố định + `aria-pressed` báo trạng thái; trái tim đặc/viền để không chỉ dựa vào màu.
 * Vùng `role="status"` luôn có sẵn để screen reader đọc được lời nhắn khi danh sách đã đầy.
 */
export function WishlistButton({
  productId,
  productName,
  size = "sm",
  className,
}: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const liked = has(productId);

  function handleClick() {
    const result = toggle(productId);
    clearTimeout(timer.current);
    if (result === "full") {
      setMessage(FULL_MESSAGE);
      timer.current = setTimeout(() => setMessage(""), FULL_MESSAGE_DURATION_MS);
    } else {
      setMessage("");
    }
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        aria-label={`Yêu thích ${productName}`}
        className={cn(
          "flex items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200 transition hover:bg-white",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
          size === "md" ? "size-11" : "size-9",
        )}
      >
        <Heart
          className={cn(
            size === "md" ? "size-6" : "size-5",
            liked ? "fill-current text-rose-600" : "text-slate-500",
          )}
          aria-hidden
        />
      </button>
      <span
        role="status"
        className={cn(
          message
            ? "absolute top-full right-0 z-10 mt-2 w-52 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg"
            : "sr-only",
        )}
      >
        {message}
      </span>
    </span>
  );
}
