import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  total: number;
  current: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function SearchBar({ query, setQuery, total, current, onPrev, onNext, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="glass-strong border-b border-fg/[0.06] px-3 sm:px-6 py-2 flex items-center gap-2 animate-fade-in">
      <div className="flex flex-1 items-center gap-2 rounded-xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2 min-w-0">
        <Icon name="Search" size={14} className="shrink-0 text-purple-400" />
        <input
          ref={inputRef}
          className="flex-1 min-w-0 bg-transparent text-sm text-fg/85 placeholder:text-fg/25 outline-none"
          placeholder="Поиск в переписке..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) onPrev();
              else onNext();
            }
            if (e.key === "Escape") onClose();
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} className="shrink-0 text-fg/30 hover:text-fg/70">
            <Icon name="X" size={12} />
          </button>
        )}
      </div>

      <span className="shrink-0 min-w-[52px] text-center text-xs text-fg/40">
        {hasQuery ? (total > 0 ? `${current + 1} из ${total}` : "нет") : ""}
      </span>

      <button
        onClick={onPrev}
        disabled={total === 0}
        title="Предыдущее"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg/50 hover:text-fg/90 hover:bg-fg/[0.08] transition-all disabled:opacity-30"
      >
        <Icon name="ChevronUp" size={16} />
      </button>
      <button
        onClick={onNext}
        disabled={total === 0}
        title="Следующее"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg/50 hover:text-fg/90 hover:bg-fg/[0.08] transition-all disabled:opacity-30"
      >
        <Icon name="ChevronDown" size={16} />
      </button>
      <button
        onClick={onClose}
        title="Закрыть поиск"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg/50 hover:text-fg/90 hover:bg-fg/[0.08] transition-all"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
}
