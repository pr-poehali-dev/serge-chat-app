import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { Chat, AuthUser } from "@/components/messenger/types";
import { API_AUTH, API_CHATS, API_PUSH, API_SEND, API_TRANSCRIBE, SESSION_STORAGE_KEY, SESSION_EXPIRED_KEY } from "./config";

interface UseAuthParams {
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setActiveChatId: (id: number | null) => void;
}

export function useAuth({ setChats, setActiveChatId }: UseAuthParams) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const logoutRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const own = [API_AUTH, API_CHATS, API_PUSH, API_SEND, API_TRANSCRIBE];
    const original = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      if (res.status === 401) {
        const input = args[0];
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (own.some((base) => url.startsWith(base))) {
          try {
            const data = await res.clone().json();
            if (data?.code === "session_expired") {
              localStorage.setItem(SESSION_EXPIRED_KEY, "1");
              logoutRef.current();
            }
          } catch {
            return res;
          }
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  // Restore session on load
  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      setAuthLoading(false);
      return;
    }
    fetch(`${API_AUTH}?action=me`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setAuthUser(data.user))
      .catch((status) => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        if (status === 401) localStorage.setItem(SESSION_EXPIRED_KEY, "1");
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthenticated = (user: AuthUser) => {
    localStorage.removeItem(SESSION_EXPIRED_KEY);
    localStorage.setItem(SESSION_STORAGE_KEY, user.sessionId);
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setAuthUser(null);
    setChats([]);
    setActiveChatId(null);
  };
  logoutRef.current = handleLogout;

  const handleUpdateProfile = async (login: string, firstName: string, lastName: string): Promise<string | null> => {
    if (!authUser) return "Не авторизован";
    try {
      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": authUser.sessionId },
        body: JSON.stringify({ action: "update-profile", login, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Не удалось сохранить";
      setAuthUser(data.user);
      return null;
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const handleAvatarUpdated = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleMoodSaved = (mood: { moodEmoji: string; moodText: string; bio: string }) => {
    setAuthUser((u) => (u ? { ...u, ...mood } : u));
  };

  const authHeaders = (): Record<string, string> =>
    authUser ? { "X-Session-Id": authUser.sessionId } : {};

  return {
    authUser,
    authLoading,
    handleAuthenticated,
    handleLogout,
    handleUpdateProfile,
    handleAvatarUpdated,
    handleMoodSaved,
    authHeaders,
  };
}
