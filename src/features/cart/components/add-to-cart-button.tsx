"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { Product } from "@/features/catalog/types";
import { getMaxQuantity } from "@/features/cart/cart-reducer";
import { getQuantityInCart, useCart } from "@/features/cart/use-cart";

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  size?: ButtonProps["size"];
  className?: string;
}

export function AddToCartButton({ product, quantity = 1, size, className }: AddToCartButtonProps) {
  const { items, addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const inCart = getQuantityInCart(items, product.id);
  const reachedLimit = inCart >= getMaxQuantity(product.stock);

  if (product.stock <= 0) {
    return (
      <Button size={size} variant="secondary" disabled className={className}>
        Hết hàng
      </Button>
    );
  }

  function handleClick() {
    addItem(product, quantity);
    setJustAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <Button
      size={size}
      onClick={handleClick}
      disabled={reachedLimit}
      className={className}
      title={reachedLimit ? "Đã đạt số lượng tối đa trong giỏ" : undefined}
    >
      {justAdded ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
      {justAdded ? "Đã thêm" : reachedLimit ? "Tối đa" : "Thêm vào giỏ"}
    </Button>
  );
}
