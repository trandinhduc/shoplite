export type OrderErrorCode =
  | "VALIDATION_ERROR"
  | "PRODUCT_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "ORDER_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION";

const HTTP_STATUS_BY_CODE: Record<OrderErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PRODUCT_NOT_FOUND: 422,
  INSUFFICIENT_STOCK: 409,
  ORDER_NOT_FOUND: 404,
  INVALID_STATUS_TRANSITION: 409,
};

/** Lỗi nghiệp vụ của đơn hàng - route handler chuyển thành HTTP response tương ứng. */
export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly details?: Record<string, string>;

  constructor(code: OrderErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return HTTP_STATUS_BY_CODE[this.code];
  }
}
