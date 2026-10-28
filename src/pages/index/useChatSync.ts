import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { Chat, ChatFolder, Message, Tab, AuthUser, NotificationItem } from "@/components/messenger/types";
import { API_CHATS } from "./config";
import { readNotifyPrefs, isQuietNow } from "@/components/messenger/sidebar/SettingsPanels";
import { registerServiceWorker } from "@/lib/push";
import { isNativeApp, startNativePush } from "@/lib/nativePush";

const POLL_INTERVAL_MS = 3000;

let audioCtx: AudioContext | null = null;
function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.26);
  } catch {
    return;
  }
}

interface UseChatSyncParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setFolders?: Dispatch<SetStateAction<ChatFolder[]>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  activeChatId: number | null;
  setActiveChatId: (id: number | null) => void;
  setActiveChatIdRaw: Dispatch<SetStateAction<number | null>>;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isBotChat: boolean;
  activeTopicId: number | null;
  onIncomingCallHint?: () => void;
}

export function useChatSync({
  authUser,
  authHeaders,
  setChats,
  setFolders,
  setMessages,
  activeChatId,
  setActiveChatId,
  setActiveChatIdRaw,
  activeTab,
  setActiveTab,
  isBotChat,
  activeTopicId,
  onIncomingCallHint,
}: UseChatSyncParams) {
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [groupCalls, setGroupCalls] = useState<{ callId: number; chatId: number; isVideo: boolean; participants: number }[]>([]);

  // Load chats (once authenticated)
  useEffect(() => {
    if (!authUser) return;
    setLoadingChats(true);
    fetch(API_CHATS, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setChats(data.chats || []);
        setFolders?.(data.folders || []);
        if (data.chats?.length > 0 && !activeChatId) {
          setActiveChatIdRaw(data.chats[0].id);
        }
      })
      .finally(() => setLoadingChats(false));
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    if (isNativeApp()) {
      startNativePush(authUser.sessionId, (info) => {
        if (info.chatId) {
          setActiveChatId(info.chatId);
          setActiveTab("chats");
        }
      });
    } else {
      registerServiceWorker();
    }
    const open = (chatId: number | null) => {
      if (!chatId) return;
      setActiveChatId(chatId);
      setActiveTab("chats");
    };
    const fromUrl = new URLSearchParams(window.location.search).get("chat");
    if (fromUrl) {
      open(Number(fromUrl));
      window.history.replaceState({}, "", window.location.pathname);
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "open-chat") open(e.data.chatId);
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [authUser]);

  // Automatically mark notifications as read when the bell tab is opened
  useEffect(() => {
    if (activeTab !== "notifications") return;
    setNotifications((prev) => (prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev));
  }, [activeTab]);

  const messagesUrl = (chatId: number, topicId: number | null) =>
    `${API_CHATS}?action=messages&chat_id=${chatId}${topicId ? `&topic_id=${topicId}` : ""}`;

  // Load messages when chat or topic changes
  useEffect(() => {
    if (!activeChatId || isBotChat || activeChatId < 0 || !authUser) return;
    let cancelled = false;
    setLoadingMsgs(true);
    setMessages([]);
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, unread: 0 } : c)));
    fetch(messagesUrl(activeChatId, activeTopicId), { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingMsgs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatId, activeTopicId, isBotChat, authUser]);

  const activeChatIdRef = useRef<number | null>(null);
  const activeTopicIdRef = useRef<number | null>(null);
  const activeTabRef = useRef<Tab>("chats");
  const isBotChatRef = useRef(false);
  const hintRef = useRef<(() => void) | undefined>(undefined);
  hintRef.current = onIncomingCallHint;
  const prevChatsRef = useRef<Record<number, { unread: number; lastMsg: string; time: string }>>({});
  const lastMessagesSigRef = useRef("");
  activeChatIdRef.current = activeChatId;
  activeTopicIdRef.current = activeTopicId;
  activeTabRef.current = activeTab;
  isBotChatRef.current = isBotChat;

  // Poll: refresh chat list (statuses, typing, unread), fill the bell, refresh the open chat
  useEffect(() => {
    if (!authUser) return;
    prevChatsRef.current = {};
    let stopped = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(API_CHATS, { headers: { "X-Session-Id": authUser.sessionId } });
        if (!res.ok || stopped) return;
        const data = await res.json();
        if (data.incomingCall) hintRef.current?.();
        setGroupCalls(data.groupCalls || []);
        const fresh: Chat[] = data.chats || [];
        const openId = activeChatIdRef.current;
        const firstRun = Object.keys(prevChatsRef.current).length === 0;
        const newNotes: NotificationItem[] = [];

        const normalized = fresh.map((c) => {
          const prev = prevChatsRef.current[c.id];
          const isOpen = c.id === openId;
          if (!firstRun && !isOpen && c.notifyEnabled !== false && c.unread > (prev?.unread ?? 0)) {
            newNotes.push({
              id: Date.now() + c.id,
              icon: "MessageCircle",
              text: `${c.name}: ${c.lastMsg || "новое сообщение"}`,
              time: c.time || "сейчас",
              color: c.color,
              read: activeTabRef.current === "notifications",
            });
          }
          prevChatsRef.current[c.id] = { unread: c.unread, lastMsg: c.lastMsg, time: c.time };
          return isOpen ? { ...c, unread: 0 } : c;
        });

        setChats(normalized);
        if (Array.isArray(data.folders)) setFolders?.(data.folders);
        if (newNotes.length > 0) {
          const prefs = readNotifyPrefs();
          if (prefs.inApp) setNotifications((prev) => [...newNotes, ...prev].slice(0, 50));
          if (prefs.sound && !isQuietNow(prefs)) playBeep();
        }

        if (openId && openId > 0 && !isBotChatRef.current) {
          const topicId = activeTopicIdRef.current;
          const r = await fetch(messagesUrl(openId, topicId), {
            headers: { "X-Session-Id": authUser.sessionId },
          });
          if (r.ok && !stopped && openId === activeChatIdRef.current && topicId === activeTopicIdRef.current) {
            const d = await r.json();
            const fetched: Message[] = d.messages || [];
            const sig = JSON.stringify(fetched);
            if (sig !== lastMessagesSigRef.current) {
              lastMessagesSigRef.current = sig;
              setMessages((cur) => {
                const pending = cur.filter((m) => m.id > 1e12);
                return [...fetched, ...pending];
              });
            }
          }
        }
      } catch {
        return;
      }
    };

    tick();
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [authUser]);

  return { loadingChats, loadingMsgs, notifications, groupCalls, lastMessagesSigRef };
}
