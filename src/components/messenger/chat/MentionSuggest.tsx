import { GroupMember } from "../groupMembers/types";

interface MentionSuggestProps {
  members: GroupMember[];
  activeIndex: number;
  onPick: (member: GroupMember) => void;
  onHover: (index: number) => void;
}

export default function MentionSuggest({ members, activeIndex, onPick, onHover }: MentionSuggestProps) {
  if (members.length === 0) return null;
  return (
    <div
      className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-56 overflow-y-auto rounded-2xl animate-fade-in"
      style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))", backdropFilter: "blur(20px)" }}
      role="listbox"
    >
      {members.map((m, i) => (
        <button
          key={m.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(m)}
          onMouseEnter={() => onHover(i)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${i === activeIndex ? "bg-fg/[0.08]" : "hover:bg-fg/[0.05]"}`}
        >
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover" />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${m.avatarColor}cc, ${m.avatarColor}55)` }}
            >
              {m.avatarInitials}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg/90">{m.displayName}</span>
            {m.login && <span className="block truncate text-[11px] text-fg/40">@{m.login}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
