import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Tab, AuthUser, DirectoryUser, FoundMessage } from "../types";
import GlobalSearch from "./GlobalSearch";
import { API_AUTH } from "@/pages/index/config";

interface SearchTabProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  setActiveChatId: (id: number) => void;
  chats: Chat[];
  authUser: AuthUser | null;
  onStartChatWithUser: (userId: number) => Promise<string | null>;
  onOpenFoundMessage?: (found: FoundMessage, query: string) => void;
}

export default function SearchTab({
  activeTab,
  setActiveTab,
  setActiveChatId,
  chats,
  authUser,
  onStartChatWithUser,
  onOpenFoundMessage,
}: SearchTabProps) {
  const [searchMode, setSearchMode] = useState<"people" | "messages">("people");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChatId, setStartingChatId] = useState<number | null>(null);
  const [startChatError, setStartChatError] = useState("");

  useEffect(() => {
    if (activeTab !== "search" || !authUser) return;
    const query = userSearch.trim();
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(`${API_AUTH}?action=users&search=${encodeURIComponent(query)}`, {
        headers: { "X-Session-Id": authUser.sessionId },
      })
        .then((r) => r.json())
        .then((data) => setSearchResults(data.users || []))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [userSearch, activeTab, authUser]);

  const handleStartChat = async (userId: number) => {
    setStartChatError("");
    setStartingChatId(userId);
    const err = await onStartChatWithUser(userId);
    setStartingChatId(null);
    if (err) setStartChatError(err);
  };

  if (activeTab !== "search") return null;

  return (
    <div className="animate-fade-in">
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-fg/[0.05] p-1">
        {([["people", "Люди"], ["messages", "Сообщения"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSearchMode(id)}
            className={`rounded-xl px-2 py-2 text-xs font-medium transition-all ${
              searchMode === id ? "bg-fg/[0.12] text-foreground shadow-sm" : "text-fg/45 hover:text-fg/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {searchMode === "messages" && authUser && onOpenFoundMessage && (
        <GlobalSearch sessionId={authUser.sessionId} chats={chats} onOpenResult={onOpenFoundMessage} />
      )}
      {searchMode === "people" && (<>
      <div className="flex items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-3 mb-4">
        <Icon name="Search" size={16} className="text-purple-400" />
        <input
          className="flex-1 bg-transparent text-sm text-fg/80 placeholder:text-fg/25 outline-none"
          placeholder="Ник, имя или фамилия..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          autoFocus
        />
        {searching && <Icon name="Loader" size={14} className="animate-spin text-fg/30" />}
      </div>

      {startChatError && <p className="text-xs text-red-400 px-1 mb-3">{startChatError}</p>}

      {userSearch.trim() ? (
        searchResults.length === 0 && !searching ? (
          <p className="text-center text-xs text-fg/25 py-8">Никого не найдено</p>
        ) : (
          <div className="space-y-1">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-fg/[0.04] transition-all">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.displayName} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${u.avatarColor}cc, ${u.avatarColor}55)` }}
                  >
                    {u.avatarInitials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg/80 truncate">{u.displayName}</p>
                  {u.login && <p className="text-xs text-fg/30 truncate">@{u.login}</p>}
                </div>
                <button
                  onClick={() => handleStartChat(u.id)}
                  disabled={startingChatId === u.id}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl gradient-btn text-white text-xs font-medium px-3 py-1.5 transition-all disabled:opacity-50 hover:-translate-y-0.5"
                >
                  <Icon name={startingChatId === u.id ? "Loader" : "UserPlus"} size={13} className={startingChatId === u.id ? "animate-spin" : ""} />
                  Написать
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <p className="text-xs text-fg/25 px-1 mb-3">РЕКОМЕНДАЦИИ</p>
          {chats.slice(0, 4).map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-fg/[0.04] cursor-pointer transition-all"
              onClick={() => { setActiveChatId(c.id); setActiveTab("chats"); }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
              >
                {c.avatar}
              </div>
              <span className="text-sm text-fg/60">{c.name}</span>
            </div>
          ))}
        </>
      )}
      </>)}
    </div>
  );
}
