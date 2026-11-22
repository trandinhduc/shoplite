import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        emoji="🧭"
        title="Không tìm thấy trang"
        description="Trang bạn tìm không tồn tại hoặc đã bị di chuyển."
        action={
          <Link href="/" className={buttonStyles()}>
            Về trang chủ
          </Link>
        }
      />
    </div>
  );
}
