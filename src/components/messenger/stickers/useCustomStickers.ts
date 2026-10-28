import { useCallback, useEffect, useState } from "react";
import { API_CHATS } from "@/pages/index/config";
import { StickerPack } from "../types";

const MAX_SIDE = 512;

function fileToPngBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось обработать картинку"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать картинку"));
    };
    img.src = url;
  });
}

export function useCustomStickers(sessionId: string | null) {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const headers = useCallback(
    (): Record<string, string> => ({ "Content-Type": "application/json", "X-Session-Id": sessionId || "" }),
    [sessionId]
  );

  const load = useCallback(() => {
    if (!sessionId) return;
    fetch(`${API_CHATS}?action=sticker-packs`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPacks(d.packs || []))
      .catch(() => undefined);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (action: string, body: Record<string, unknown>) => {
    const res = await fetch(`${API_CHATS}?action=${action}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Не удалось выполнить действие");
    return data;
  };

  const createPack = async (title: string): Promise<StickerPack | null> => {
    setBusy(true);
    setError("");
    try {
      const data = await call("create-sticker-pack", { title });
      setPacks((prev) => [...prev, data.pack]);
      return data.pack as StickerPack;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать набор");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const deletePack = async (packId: number) => {
    setError("");
    const snapshot = packs;
    setPacks((prev) => prev.filter((p) => p.id !== packId));
    try {
      await call("delete-sticker-pack", { pack_id: packId });
    } catch (e) {
      setPacks(snapshot);
      setError(e instanceof Error ? e.message : "Не удалось удалить набор");
    }
  };

  const addImages = async (packId: number, files: File[]) => {
    setBusy(true);
    setError("");
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Подойдут только картинки");
        continue;
      }
      try {
        const imageBase64 = await fileToPngBase64(file);
        const data = await call("add-sticker", { pack_id: packId, imageBase64, contentType: "image/png" });
        setPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, stickers: [...p.stickers, data.sticker] } : p)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить картинку");
        break;
      }
    }
    setBusy(false);
  };

  const deleteSticker = async (packId: number, stickerId: number) => {
    setError("");
    const snapshot = packs;
    setPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, stickers: p.stickers.filter((s) => s.id !== stickerId) } : p)));
    try {
      await call("delete-sticker", { sticker_id: stickerId });
    } catch (e) {
      setPacks(snapshot);
      setError(e instanceof Error ? e.message : "Не удалось удалить стикер");
    }
  };

  return { packs, busy, error, setError, createPack, deletePack, addImages, deleteSticker };
}
