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
  const [emojiTab, setEmojiTab] = useState<"emoji" | "gif">("emoji");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((f) => ({
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type,
      file: f,
      ...getFileInfo(f),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
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
  };
}
