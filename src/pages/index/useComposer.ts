import { useState, useEffect, useRef } from "react";
import { Attachment } from "@/components/messenger/types";
import { GIF_CATEGORIES } from "./config";

export function useComposer() {
  const [inputText, setInputText] = useState("");

  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "icq" | "gif">("emoji");
  const [gifSearch, setGifSearch] = useState("");
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attach menu on outside click
  useEffect(() => {
    if (!attachMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [attachMenuOpen]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiPickerOpen]);

  const filteredGifs = gifSearch
    ? GIF_CATEGORIES.flatMap((c) => c.gifs).filter((g) => g.title.toLowerCase().includes(gifSearch.toLowerCase()))
    : null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  const getFileInfo = (file: File): { icon: string; color: string } => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return { icon: "Image", color: "#a855f7" };
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return { icon: "Video", color: "#ec4899" };
    if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return { icon: "Music", color: "#38bdf8" };
    if (["pdf"].includes(ext)) return { icon: "FileText", color: "#ef4444" };
    if (["doc", "docx"].includes(ext)) return { icon: "FileText", color: "#3b82f6" };
    if (["xls", "xlsx"].includes(ext)) return { icon: "FileSpreadsheet", color: "#34d399" };
    if (["zip", "rar", "7z"].includes(ext)) return { icon: "Archive", color: "#f59e0b" };
    return { icon: "File", color: "#6366f1" };
  };

  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const [fileNotice, setFileNotice] = useState("");

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const accepted: File[] = [];
    const tooBig: string[] = [];
    for (const f of incoming) {
      if (f.size > MAX_FILE_BYTES) tooBig.push(f.name || "файл");
      else if (f.size === 0) tooBig.push(`${f.name || "файл"} (пустой)`);
      else accepted.push(f);
    }
    if (tooBig.length > 0) {
      setFileNotice(`Не добавлено (лимит 8 МБ): ${tooBig.join(", ")}`);
      window.setTimeout(() => setFileNotice(""), 6000);
    }
    const stamp = Date.now();
    const newAttachments = accepted.map((f, i) => {
      const named =
        f.name && f.name !== "image.png"
          ? f
          : new File([f], `Снимок-${stamp}-${i + 1}.${(f.type.split("/")[1] || "png").split("+")[0]}`, { type: f.type });
      return {
        name: named.name,
        size: formatFileSize(named.size),
        type: named.type,
        file: named,
        ...getFileInfo(named),
      };
    });
    if (newAttachments.length > 0) setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    setAttachMenuOpen(false);
    e.target.value = "";
  };

  return {
    inputText,
    setInputText,
    attachMenuOpen,
    setAttachMenuOpen,
    attachments,
    setAttachments,
    fileInputRef,
    imageInputRef,
    emojiPickerOpen,
    setEmojiPickerOpen,
    emojiTab,
    setEmojiTab,
    gifSearch,
    setGifSearch,
    emojiPickerRef,
    attachMenuRef,
    filteredGifs,
    handleFileSelect,
    addFiles,
    fileNotice,
  };
}
