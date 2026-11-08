# Specification Quality Checklist: Mã giảm giá khi thanh toán

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Lượt kiểm tra 1: tất cả mục đạt. Không dùng marker [NEEDS CLARIFICATION]; các điểm chưa nêu trong
  mô tả được chốt bằng mặc định hợp lý và ghi ở mục Assumptions:
  - Ngưỡng miễn phí giao hàng và giá trị tối thiểu của mã xét trên tạm tính **trước** giảm giá
    (FR-006, FR-010).
  - Giảm giá chỉ áp lên tiền hàng, không lên phí giao hàng; làm tròn xuống đến đồng (FR-007).
  - Mã hết hạn còn hiệu lực đến hết ngày theo giờ Việt Nam (FR-011).
  - Mã không hợp lệ lúc đặt hàng → từ chối đơn, không tự bỏ mã (FR-021).
- Nên xác nhận các mặc định trên với marketing qua `/speckit-clarify` nếu cần trước `/speckit-plan`.
