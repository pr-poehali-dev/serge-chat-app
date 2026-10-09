import { Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Topic } from "../types";

interface ChatHeaderProps {
  activeChat: Chat;
  showEncryptBadge: boolean;
  setShowEncryptBadge: Dispatch<SetStateAction<boolean>>;
  setCall: Dispatch<SetStateAction<{ isVideo: boolean } | null>>;
  topics?: Topic[];
  activeTopicId?: number | null;
  onSelectTopic?: (id: number | null) => void;
  onOpenCreateTopic?: () => void;
  onTogglePinTopic?: (topicId: number) => void;
  onOpenGroupMembers?: () => void;
  onBack?: () => void;
}

export default function ChatHeader({
  activeChat,
  showEncryptBadge,
  setShowEncryptBadge,
  setCall,
  topics,
  activeTopicId,
  onSelectTopic,
  onOpenCreateTopic,
  onTogglePinTopic,
  onOpenGroupMembers,
  onBack,
}: ChatHeaderProps) {
  return (
    <>
      {/* Header */}
      <header className="glass-strong border-b border-white/[0.06] px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 hover:text-white/90 hover:bg-white/[0.06] transition-all -ml-1"
            >
              <Icon name="ArrowLeft" size={18} />
            </button>
          )}
          <div className="relative">
            {activeChat.avatarUrl ? (
              <img
                src={activeChat.avatarUrl}
                alt={activeChat.name}
                className="h-11 w-11 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
              >
                {activeChat.avatar}
              </div>
            )}
            {activeChat.online && !activeChat.isGroup && (
              <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white/95 truncate">{activeChat.name}</h2>
            <p className="text-xs text-white/35 truncate">
              {activeChat.isGroup ? "групповой чат" : activeChat.online ? "в сети" : "был(а) недавно"}
            </p>
          </div>

          {showEncryptBadge && (
            <div className="ml-4 hidden md:flex items-center gap-1.5 rounded-full bg-emerald-400/[0.08] border border-emerald-400/20 px-3 py-1.5 animate-fade-in shrink-0">
              <Icon name="Lock" size={11} className="text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Зашифровано</span>
              <button onClick={() => setShowEncryptBadge(false)} className="ml-1 text-emerald-400/40 hover:text-emerald-400 transition-colors">
                <Icon name="X" size={10} />
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setCall({ isVideo: false })}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            >
              <Icon name="Phone" size={16} />
            </button>
            <button
              onClick={() => setCall({ isVideo: true })}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            >
              <Icon name="Video" size={16} />
            </button>
            {activeChat.isGroup ? (
              <button
                onClick={onOpenGroupMembers}
                title="Участники группы"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
              >
                <Icon name="Users" size={16} />
              </button>
            ) : (
              <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                <Icon name="MoreVertical" size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Topics bar (group chats only) */}
      {activeChat.isGroup && topics && (
        <div className="glass-strong border-b border-white/[0.06] px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => onSelectTopic?.(null)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              !activeTopicId
                ? "bg-white/[0.1] text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
            }`}
          >
            <Icon name="MessageCircle" size={12} />
            Общий
          </button>
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`group/topic shrink-0 flex items-center gap-1 rounded-xl pl-3 pr-1.5 py-1.5 text-xs font-medium transition-all ${
                activeTopicId === topic.id
                  ? "text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
              }`}
              style={activeTopicId === topic.id ? { background: `${topic.color}33`, border: `1px solid ${topic.color}55` } : undefined}
            >
              <button
                onClick={() => onSelectTopic?.(topic.id)}
                className="flex items-center gap-1.5"
              >
                {topic.pinned && <Icon name="Pin" size={10} className="text-amber-400 fill-amber-400" />}
                <Icon name="Hash" size={12} style={{ color: activeTopicId === topic.id ? topic.color : undefined }} />
                {topic.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePinTopic?.(topic.id); }}
                title={topic.pinned ? "Открепить тему" : "Закрепить тему"}
                className={`flex h-5 w-5 items-center justify-center rounded-lg transition-all ${
                  topic.pinned
                    ? "text-amber-400 opacity-100"
                    : "text-white/30 opacity-0 group-hover/topic:opacity-100 hover:text-amber-400"
                }`}
              >
                <Icon name="Pin" size={11} className={topic.pinned ? "fill-amber-400" : ""} />
              </button>
            </div>
          ))}
          <button
            onClick={onOpenCreateTopic}
            title="Создать тему"
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-xl text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08] transition-all"
          >
            <Icon name="Plus" size={14} />
          </button>
        </div>
      )}
    </>
  );
}
