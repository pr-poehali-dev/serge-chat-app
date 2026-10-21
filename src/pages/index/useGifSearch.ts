import { useCallback, useEffect, useRef, useState } from "react";
import { API_PUSH } from "./config";

export interface RemoteGif {
  id: string;
  title: string;
  url: string;
  preview: string;
}

const DEBOUNCE_MS = 350;

export function useGifSearch(query: string, active: boolean) {
  const [items, setItems] = useState<RemoteGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const pageRef = useRef(1);
  const tokenRef = useRef(0);
  const queryRef = useRef("");

  const load = useCallback(async (q: string, page: number, append: boolean) => {
    const token = ++tokenRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_PUSH}?action=gif-search&q=${encodeURIComponent(q)}&page=${page}`);
      const data = await res.json();
      if (token !== tokenRef.current) return;
      if (!res.ok) {
        setError(data.error || "Поиск GIF сейчас недоступен");
        if (!append) setItems([]);
        setHasNext(false);
        return;
      }
      setEnabled(data.enabled !== false);
      setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
      setHasNext(!!data.hasNext);
      pageRef.current = page;
    } catch {
      if (token !== tokenRef.current) return;
      setError("Не удалось загрузить GIF");
      if (!append) setItems([]);
      setHasNext(false);
    } finally {
      if (token === tokenRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const q = query.trim();
    queryRef.current = q;
    const timer = window.setTimeout(() => load(q, 1, false), q ? DEBOUNCE_MS : 0);
    return () => window.clearTimeout(timer);
  }, [query, active, load]);

  const loadMore = useCallback(() => {
    if (loading || !hasNext) return;
    load(queryRef.current, pageRef.current + 1, true);
  }, [loading, hasNext, load]);

  return { items, loading, hasNext, enabled, error, loadMore };
}
