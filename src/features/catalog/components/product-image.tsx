import type { ProductImage as ProductImageData } from "@/features/catalog/types";
import { cn } from "@/lib/cn";

interface ProductImageProps {
  image: ProductImageData;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const EMOJI_SIZE = { sm: "text-2xl", md: "text-6xl", lg: "text-9xl" };

/** Ảnh minh họa sản phẩm: emoji trên nền gradient (không cần tải ảnh từ internet). */
export function ProductImage({ image, alt, size = "md", className }: ProductImageProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("flex aspect-square items-center justify-center rounded-xl", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${image.from}, ${image.to})` }}
    >
      <span className={cn("drop-shadow-sm select-none", EMOJI_SIZE[size])} aria-hidden>
        {image.emoji}
      </span>
    </div>
  );
}
