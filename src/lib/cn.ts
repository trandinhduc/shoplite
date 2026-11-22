import { clsx, type ClassValue } from "clsx";

/** Ghép className có điều kiện: cn("a", isActive && "b") */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
