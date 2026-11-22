"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "@/components/ui/quantity-input";
import type { Product } from "@/features/catalog/types";
import { getMaxQuantity } from "@/features/cart/cart-reducer";
import { getQuantityInCart, useCart } from "@/features/cart/use-cart";
import { AddToCartButton } from "./add-to-cart-button";

/** Khối chọn số lượng + "Thêm vào giỏ" + "Mua ngay" ở trang chi tiết sản phẩm. */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { items, addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const remaining = getMaxQuantity(product.stock) - getQuantityInCart(items, product.id);
  // Không cho chọn vượt quá số lượng còn có thể thêm vào giỏ.
  const selectedQuantity = Math.min(quantity, Math.max(1, remaining));

  if (product.stock <= 0) {
    return (
      <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        Sản phẩm tạm hết hàng. Vui lòng quay lại sau.
      </p>
    );
  }

  function handleBuyNow() {
    addItem(product, selectedQuantity);
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-3" data-testid="purchase-panel">
      <div className="flex items-center gap-3">
        <QuantityInput
          value={selectedQuantity}
          max={Math.max(1, remaining)}
          onChange={setQuantity}
        />
        {remaining <= 0 && (
          <span className="text-sm text-amber-700">
            Bạn đã có số lượng tối đa của sản phẩm này trong giỏ.
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <AddToCartButton
          product={product}
          quantity={selectedQuantity}
          size="lg"
          className="flex-1"
        />
        <Button
          size="lg"
          variant="secondary"
          onClick={handleBuyNow}
          disabled={remaining <= 0}
          className="flex-1"
        >
          <Zap className="size-4" />
          Mua ngay
        </Button>
      </div>
    </div>
  );
}
