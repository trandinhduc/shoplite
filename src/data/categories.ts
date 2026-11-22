import type { Category } from "@/features/catalog/types";

export const categories: Category[] = [
  {
    slug: "am-thanh",
    name: "Âm thanh",
    emoji: "🎧",
    description: "Tai nghe, loa và micro cho trải nghiệm âm thanh sống động.",
  },
  {
    slug: "ban-phim-chuot",
    name: "Bàn phím & Chuột",
    emoji: "⌨️",
    description: "Bàn phím cơ, chuột không dây và phụ kiện bàn làm việc.",
  },
  {
    slug: "phu-kien",
    name: "Phụ kiện",
    emoji: "🔌",
    description: "Sạc, cáp, pin dự phòng và giá đỡ cho thiết bị của bạn.",
  },
  {
    slug: "thiet-bi-deo",
    name: "Thiết bị đeo",
    emoji: "⌚",
    description: "Đồng hồ thông minh, vòng đeo sức khỏe và kính thực tế ảo.",
  },
  {
    slug: "nha-thong-minh",
    name: "Nhà thông minh",
    emoji: "💡",
    description: "Đèn, camera và robot giúp ngôi nhà tiện nghi hơn.",
  },
];
