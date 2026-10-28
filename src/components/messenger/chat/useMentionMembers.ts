import { useEffect, useState } from "react";
import { API_CHATS } from "@/pages/index/config";
import { GroupMember } from "../groupMembers/types";

export function useMentionMembers(chatId: number | undefined, isGroup: boolean, sessionId?: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    setMembers([]);
    if (!chatId || chatId < 0 || !isGroup || !sessionId) return;
    let cancelled = false;
    fetch(`${API_CHATS}?action=members&chat_id=${chatId}`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setMembers(d.members || []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chatId, isGroup, sessionId]);

  return members;
}
