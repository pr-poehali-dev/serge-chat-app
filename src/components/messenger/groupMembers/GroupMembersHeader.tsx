import Icon from "@/components/ui/icon";
import { Chat } from "../types";

interface GroupMembersHeaderProps {
  chat: Chat;
  groupAvatar: string | null;
  groupName: string;
  membersCount: number;
  onClose: () => void;
}

export default function GroupMembersHeader({ chat, groupAvatar, groupName, membersCount, onClose }: GroupMembersHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-fg/[0.07]">
      <div className="flex items-center gap-2">
        {groupAvatar ? (
          <img src={groupAvatar} alt={groupName} className="h-9 w-9 rounded-xl object-cover" />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}55)` }}
          >
            {chat.avatar}
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold text-fg/95">{groupName}</h2>
          <p className="text-[11px] text-fg/35">{membersCount ? `Участников: ${membersCount}` : "Участники группы"}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-fg/40 hover:text-fg/80 hover:bg-fg/[0.06] transition-all"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
}
