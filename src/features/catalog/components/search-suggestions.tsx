"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { MIN_QUERY_LENGTH, type Suggestion } from "@/features/catalog/suggest-service";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

const DEBOUNCE_MS = 300;

interface SearchSuggestionsProps {
  defaultValue: string;
  inputClassName: string;
}

/** Ô tìm kiếm có danh sách gợi ý (combobox). Gõ từ 2 ký tự, chọn bằng chuột hoặc ↑ ↓ Enter. */
export function SearchSuggestions({ defaultValue, inputClassName }: SearchSuggestionsProps) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const keyword = value.trim();

  useEffect(() => {
    if (keyword.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/suggest?q=${encodeURIComponent(keyword)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { suggestions: Suggestion[] };
        setSuggestions(body.suggestions);
        setActive(-1);
      } catch {
        // Người dùng gõ tiếp (request bị hủy) hoặc mất mạng: giữ nguyên danh sách cũ.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword]);

  const showList = open && keyword.length >= MIN_QUERY_LENGTH && suggestions !== null;

  function openProduct(slug: string) {
    setOpen(false);
    router.push(`/products/${slug}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList || !suggestions) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, -1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      openProduct(suggestions[active].slug);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Tìm sản phẩm, thương hiệu... (VD: tai nghe, ban phim)"
        aria-label="Từ khóa tìm kiếm"
        className={cn(inputClassName, "pl-9")}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
          className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Không tìm thấy sản phẩm phù hợp</li>
          ) : (
            suggestions.map((suggestion, index) => (
              <li
                key={suggestion.slug}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  openProduct(suggestion.slug);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                  index === active ? "bg-indigo-50" : "hover:bg-slate-50",
                )}
              >
                <span className="text-slate-900">{suggestion.name}</span>
                <span className="shrink-0 text-slate-500">{formatCurrency(suggestion.price)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
