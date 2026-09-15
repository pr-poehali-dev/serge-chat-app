import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Chat } from "./types";

interface CreateGroupModalProps {
  contacts: Chat[];
  onCreate: (name: string, memberIds: number[]) => void;
  onClose: () => void;
}

export default function CreateGroupModal({ contacts, onCreate, onClose }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canCreate = groupName.trim().length > 0 && selected.length > 0;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-3xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-btn">
              <Icon name="Users" size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">Новая группа</h2>
              <p className="text-[11px] text-white/35">Выберите участников и название</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Group name */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white"
            style={{ background: groupName.trim() ? "linear-gradient(135deg, #a855f7cc, #ec489966)" : "rgba(255,255,255,0.06)" }}
          >
            {groupName.trim() ? groupName.trim()[0].toUpperCase() : <Icon name="Camera" size={16} className="text-white/30" />}
          </div>
          <input
            className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
            placeholder="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Search contacts */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
            <Icon name="Search" size={14} className="text-white/30" />
            <input
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
              placeholder="Поиск контактов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Selected count */}
        {selected.length > 0 && (
          <div className="px-5 pt-3">
            <p className="text-[11px] text-purple-400 font-medium">
              Выбрано: {selected.length} {selected.length === 1 ? "участник" : "участника(ов)"}
            </p>
          </div>
        )}

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filteredContacts.length === 0 ? (
            <p className="text-center text-xs text-white/25 py-8">Контакты не найдены</p>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                    isSelected ? "bg-purple-500/[0.1]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
                  >
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{c.name}</p>
                    <p className="text-xs text-white/35">{c.online ? "онлайн" : "был(а) недавно"}</p>
                  </div>
                  <div
                    className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "bg-purple-500 border-purple-500"
                        : "border-white/20"
                    }`}
                  >
                    {isSelected && <Icon name="Check" size={12} className="text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.07]">
          <button
            onClick={() => canCreate && onCreate(groupName.trim(), selected)}
            disabled={!canCreate}
            className="w-full rounded-2xl gradient-btn text-white text-sm font-medium py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            Создать группу
          </button>
        </div>
      </div>
    </div>
  );
}
