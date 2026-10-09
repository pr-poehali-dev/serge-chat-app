import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Chat, AuthUser } from "@/components/messenger/types";
import { API_AUTH, SESSION_STORAGE_KEY } from "./config";

interface UseAuthParams {
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setActiveChatId: (id: number | null) => void;
}

export function useAuth({ setChats, setActiveChatId }: UseAuthParams) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session on load
  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      setAuthLoading(false);
      return;
    }
    fetch(`${API_AUTH}?action=me`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAuthUser(data.user))
      .catch(() => localStorage.removeItem(SESSION_STORAGE_KEY))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthenticated = (user: AuthUser) => {
    localStorage.setItem(SESSION_STORAGE_KEY, user.sessionId);
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setAuthUser(null);
    setChats([]);
    setActiveChatId(null);
  };

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

  const authHeaders = (): Record<string, string> =>
    authUser ? { "X-Session-Id": authUser.sessionId } : {};

  return {
    authUser,
    authLoading,
    handleAuthenticated,
    handleLogout,
    handleUpdateProfile,
    handleAvatarUpdated,
    authHeaders,
  };
}
