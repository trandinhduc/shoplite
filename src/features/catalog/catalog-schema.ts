import { z } from "zod";

/** Số mã sản phẩm tối đa cho một lần tra cứu theo danh sách mã (`GET /api/products/by-ids`). */
export const MAX_PRODUCT_IDS_PER_LOOKUP = 50;

/** Mã sản phẩm chỉ gồm chữ, số, gạch ngang, gạch dưới (ví dụ `p001`). */
const PRODUCT_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Tham số `ids` của trang yêu thích: danh sách mã cách nhau bằng dấu phẩy.
 * Bỏ khoảng trắng thừa và phần tử rỗng (ví dụ dấu phẩy ở cuối); trả về mảng mã đã cắt gọn.
 */
export const productIdsQuerySchema = z
  .string("Thiếu tham số ids")
  .transform((value) =>
    value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== ""),
  )
  .pipe(
    z
      .array(z.string().regex(PRODUCT_ID_REGEX, "Mã sản phẩm không hợp lệ"))
      .min(1, "Vui lòng cung cấp ít nhất một mã sản phẩm")
      .max(
        MAX_PRODUCT_IDS_PER_LOOKUP,
        `Chỉ tra cứu tối đa ${MAX_PRODUCT_IDS_PER_LOOKUP} mã sản phẩm mỗi lần`,
      ),
  );
