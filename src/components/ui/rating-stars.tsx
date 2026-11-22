import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({ rating, reviewCount, className }: RatingStarsProps) {
  const rounded = Math.round(rating);

  return (
    <div
      className={cn("flex items-center gap-1 text-sm text-slate-500", className)}
      aria-label={`Đánh giá ${rating} trên 5 sao`}
    >
      <div className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            className={cn(
              "size-4",
              value <= rounded ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200",
            )}
          />
        ))}
      </div>
      <span className="font-medium text-slate-700">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && <span>({reviewCount})</span>}
    </div>
  );
}
