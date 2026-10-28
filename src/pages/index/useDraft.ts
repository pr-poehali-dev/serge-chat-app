import { Dispatch, SetStateAction, useEffect, useRef } from "react";

const PREFIX = "trindelka_draft_";

interface Params {
  userId: number | null;
  chatId: number | null;
  topicId: number | null;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  suspended: boolean;
}

const keyFor = (userId: number, chatId: number, topicId: number | null) => `${PREFIX}${userId}_${chatId}_${topicId ?? 0}`;

const read = (key: string): string => {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
};

export function useDraft({ userId, chatId, topicId, text, setText, suspended }: Params) {
  const key = userId && chatId ? keyFor(userId, chatId, topicId) : null;
  const skipSaveRef = useRef(false);
  const wasSuspendedRef = useRef(false);

  useEffect(() => {
    skipSaveRef.current = true;
    wasSuspendedRef.current = false;
    setText(key ? read(key) : "");
  }, [key]);

  useEffect(() => {
    if (suspended) {
      wasSuspendedRef.current = true;
      return;
    }
    if (wasSuspendedRef.current && key) {
      wasSuspendedRef.current = false;
      skipSaveRef.current = true;
      setText(read(key));
    }
  }, [suspended]);

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (!key || suspended) return;
    try {
      if (text.trim()) localStorage.setItem(key, text);
      else localStorage.removeItem(key);
    } catch {
      return;
    }
  }, [text, key, suspended]);
}
