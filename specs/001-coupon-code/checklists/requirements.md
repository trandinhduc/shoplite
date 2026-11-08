# Requirements Quality Checklist: 001-coupon-code

**Purpose**: Thẩm định chất lượng tài liệu đặc tả yêu cầu (spec.md) của tính năng mã giảm giá (Coupon Code).  
**Created**: 2026-11-08  
**Feature**: [spec.md](../spec.md)  

## 1. Tính độc lập kỹ thuật (Technology-Agnostic)
- [x] CHK001 Không chứa tên file, tên hàm, đường dẫn source code (`src/...`) hay chi tiết framework cụ thể trong phần mô tả hành vi.
- [x] CHK002 Chỉ mô tả hành vi người dùng, quy tắc kinh doanh (Business Rules) và kết quả mong đợi từ góc nhìn người dùng/nghiệp vụ.

## 2. Chất lượng User Stories & Kịch bản kiểm thử
- [x] CHK003 Mỗi User Story có độ ưu tiên rõ ràng (P1, P2, P3) và có thể kiểm thử độc lập (Independently Testable).
- [x] CHK004 Tất cả kịch bản chấp nhận (Acceptance Scenarios) đều được viết theo chuẩn **Given / When / Then**.
- [x] CHK005 Đầy đủ cả 3 mã khuyến mãi mẫu được kiểm thử trong kịch bản: `SHOPLITE10` (giảm % có trần), `GIAM50K` (giảm cố định), `TET2026` (kiểm thử mã hết hạn).

## 3. Tính đo lường & Rõ ràng của Yêu cầu
- [x] CHK006 Mọi yêu cầu chức năng (FR-001 đến FR-012) đều sử dụng từ khóa chuẩn **MUST / MUST NOT**, không chứa từ mơ hồ như "nhanh", "thân thiện", "đẹp".
- [x] CHK007 Tiêu chí thành công (Success Criteria SC-001 đến SC-004) có số liệu đo lường cụ thể (dưới 300ms, tỷ lệ thất thoát 0%, 100% trường hợp lưu đúng).

## 4. An toàn nghiệp vụ & Chống gian lận (Anti-Fraud)
- [x] CHK008 Có yêu cầu bắt buộc Server phải độc lập tính toán lại số tiền giảm khi tạo đơn hàng (Server-Authoritative Pricing, tuân thủ Constitution).
- [x] CHK009 Có quy định mức giảm giá không được trừ vào phí giao hàng và không làm tổng tiền đơn hàng bị âm.

## 5. Làm rõ các câu hỏi mở (Clarifications)
- [x] CHK010 Không còn điểm đánh dấu `[NEEDS CLARIFICATION]` nào trong tài liệu spec.
- [x] CHK011 Toàn bộ 8 câu hỏi làm rõ nghiệp vụ (phân biệt hoa thường, ngưỡng freeship, múi giờ hết hạn, xử lý khi đổi giỏ hàng) đã được ghi nhận chi tiết tại mục `## Clarifications`.

## Notes
- Tài liệu spec đã đạt chuẩn chất lượng 100% để bước sang giai đoạn lập kế hoạch kỹ thuật (`/speckit.plan`).

