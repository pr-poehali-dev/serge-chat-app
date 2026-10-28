import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Chat, ChatFolder } from "../types";

export type FolderFilter = "all" | number;

interface ChatFolderTabsProps {
  folders: ChatFolder[];
  chats: Chat[];
  active: FolderFilter;
  onSelect: (value: FolderFilter) => void;
  onCreate: (name: string) => Promise<string | null>;
  onRename: (id: number, name: string) => Promise<string | null>;
  onDelete: (id: number) => Promise<string | null>;
}

const SUGGESTED = ["Работа", "Семья", "Друзья"];

export default function ChatFolderTabs({ folders, chats, active, onSelect, onCreate, onRename, onDelete }: ChatFolderTabsProps) {
  const [editor, setEditor] = useState<{ id: number | null; name: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editor) inputRef.current?.focus();
  }, [editor]);

  const unreadIn = (folderId: FolderFilter) =>
    chats.filter((c) => (folderId === "all" ? true : c.folderId === folderId)).reduce((sum, c) => sum + (c.notifyEnabled === false ? 0 : c.unread), 0);

  const submit = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setError("Введите название");
      return;
    }
    setBusy(true);
    setError("");
    const err = editor.id === null ? await onCreate(name) : await onRename(editor.id, name);
    setBusy(false);
    if (err) setError(err);
    else setEditor(null);
  };

  const remove = async () => {
    if (!editor || editor.id === null) return;
    setBusy(true);
    const err = await onDelete(editor.id);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (active === editor.id) onSelect("all");
    setEditor(null);
  };

  const missing = SUGGESTED.filter((n) => !folders.some((f) => f.name.toLowerCase() === n.toLowerCase()));

  const tab = (value: FolderFilter, label: string, folder?: ChatFolder) => {
    const unread = unreadIn(value);
    const selected = active === value;
    return (
      <button
        key={String(value)}
        onClick={() => onSelect(value)}
        onContextMenu={(e) => {
          if (!folder) return;
          e.preventDefault();
          setError("");
          setEditor({ id: folder.id, name: folder.name });
        }}
        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
          selected ? "bg-purple-500/20 text-foreground border border-purple-500/30" : "text-fg/45 hover:text-fg/75 hover:bg-fg/[0.05] border border-transparent"
        }`}
      >
        <span className="max-w-[110px] truncate">{label}</span>
        {unread > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full gradient-btn px-1 text-[9px] font-bold text-white">{unread}</span>
        )}
      </button>
    );
  };

  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tab("all", "Все")}
        {folders.map((f) => tab(f.id, f.name, f))}
        <button
          onClick={() => {
            setError("");
            setEditor({ id: null, name: "" });
          }}
          title="Новая папка"
          aria-label="Новая папка"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-fg/35 hover:text-purple-400 hover:bg-purple-400/[0.08] transition-all"
        >
          <Icon name="Plus" size={14} />
        </button>
        {active !== "all" && (
          <button
            onClick={() => {
              const f = folders.find((x) => x.id === active);
              if (f) {
                setError("");
                setEditor({ id: f.id, name: f.name });
              }
            }}
            title="Изменить папку"
            aria-label="Изменить папку"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-fg/35 hover:text-fg/70 hover:bg-fg/[0.06] transition-all"
          >
            <Icon name="Pencil" size={13} />
          </button>
        )}
      </div>

      {editor && (
        <div className="mt-2 rounded-2xl border border-fg/[0.08] bg-fg/[0.05] p-3 animate-fade-in">
          <p className="mb-2 text-[11px] font-semibold text-fg/50">{editor.id === null ? "Новая папка" : "Изменить папку"}</p>
          <input
            ref={inputRef}
            value={editor.name}
            maxLength={40}
            onChange={(e) => setEditor({ ...editor, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setEditor(null);
            }}
            placeholder="Название, например «Работа»"
            className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 placeholder:text-fg/25 outline-none focus:border-purple-500/40"
          />
          {editor.id === null && missing.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missing.map((n) => (
                <button
                  key={n}
                  onClick={() => setEditor({ ...editor, name: n })}
                  className="rounded-lg bg-fg/[0.06] px-2 py-1 text-[11px] text-fg/55 hover:bg-fg/[0.1] hover:text-fg/80"
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-xl gradient-btn py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {editor.id === null ? "Создать" : "Сохранить"}
            </button>
            {editor.id !== null && (
              <button
                onClick={remove}
                disabled={busy}
                className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-50"
              >
                Удалить
              </button>
            )}
            <button onClick={() => setEditor(null)} className="rounded-xl bg-fg/[0.06] px-3 py-2 text-xs text-fg/55 hover:bg-fg/[0.1]">
              Отмена
            </button>
          </div>
          {editor.id !== null && <p className="mt-2 text-[10px] text-fg/30">При удалении папки чаты не удаляются: они останутся во вкладке «Все».</p>}
        </div>
      )}
    </div>
  );
}
