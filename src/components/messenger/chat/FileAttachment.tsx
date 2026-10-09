import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Message } from "../types";

function formatBytes(bytes?: number | null): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function iconFor(name?: string | null): string {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "FileText";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "FileText";
  if (["xls", "xlsx", "csv"].includes(ext)) return "FileSpreadsheet";
  if (["zip", "rar", "7z"].includes(ext)) return "Archive";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "Music";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "Video";
  return "File";
}

export function ImageAttachment({ msg }: { msg: Message }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!msg.mediaUrl) return null;

  if (failed) {
    return (
      <a
        href={msg.mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-xs underline underline-offset-2"
      >
        <Icon name="ImageOff" size={14} />
        {msg.fileName || "Открыть фото"}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block">
        <img
          src={msg.mediaUrl}
          alt={msg.fileName || "Фото"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="max-h-[260px] max-w-full rounded-xl object-cover sm:max-w-[280px]"
        />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="X" size={18} />
          </button>
          <img
            src={msg.mediaUrl}
            alt={msg.fileName || "Фото"}
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export function FileCard({ msg, out }: { msg: Message; out: boolean }) {
  if (!msg.mediaUrl) return null;
  return (
    <a
      href={msg.mediaUrl}
      target="_blank"
      rel="noreferrer"
      download={msg.fileName || undefined}
      className="flex min-w-[180px] max-w-[260px] items-center gap-3"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          out ? "bg-white/20" : "bg-purple-500/20"
        }`}
      >
        <Icon name={iconFor(msg.fileName)} size={18} className="text-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{msg.fileName || "Файл"}</span>
        <span className="block text-[11px] opacity-60">{formatBytes(msg.fileSize)}</span>
      </span>
      <Icon name="Download" size={16} className="shrink-0 opacity-70" />
    </a>
  );
}
