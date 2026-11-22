"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        emoji="⚠️"
        title="Đã có lỗi xảy ra"
        description="Vui lòng thử lại. Nếu lỗi vẫn tiếp diễn, hãy kiểm tra log của server."
        action={<Button onClick={reset}>Thử lại</Button>}
      />
    </div>
  );
}
