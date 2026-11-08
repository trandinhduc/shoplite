import type { Metadata } from "next";
import { WishlistView } from "@/features/wishlist/components/wishlist-view";

export const metadata: Metadata = { title: "Yêu thích" };

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Danh sách yêu thích</h1>
      <WishlistView />
    </div>
  );
}
