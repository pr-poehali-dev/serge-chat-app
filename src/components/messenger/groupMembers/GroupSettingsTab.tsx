import { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { Chat } from "../types";
import { ConfirmState } from "./types";

interface GroupSettingsTabProps {
  chat: Chat;
  groupAvatar: string | null;
  groupName: string;
  setGroupName: (v: string) => void;
  groupDesc: string;
  setGroupDesc: (v: string) => void;
  canManage: boolean;
  isLocalChat: boolean;
  busy: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  changeAvatar: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeAvatar: () => Promise<void>;
  saveInfo: () => Promise<void>;
  setConfirm: (c: ConfirmState | null) => void;
}

export default function GroupSettingsTab({
  chat,
  groupAvatar,
  groupName,
  setGroupName,
  groupDesc,
  setGroupDesc,
  canManage,
  isLocalChat,
  busy,
  avatarInputRef,
  changeAvatar,
  removeAvatar,
  saveInfo,
  setConfirm,
}: GroupSettingsTabProps) {
  return (
    <div className="space-y-5 px-2 py-2">
      <div className="flex items-center gap-4">
        {groupAvatar ? (
          <img src={groupAvatar} alt={groupName} className="h-20 w-20 rounded-3xl object-cover" />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black text-white"
            style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}55)` }}
          >
            {chat.avatar}
          </div>
        )}
        {canManage && !isLocalChat ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl gradient-btn px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              <Icon name={busy ? "Loader" : "ImagePlus"} size={13} className={busy ? "animate-spin" : ""} />
              Сменить фото
            </button>
            {groupAvatar && (
              <button onClick={removeAvatar} disabled={busy} className="text-left text-xs text-fg/45 hover:text-red-400 disabled:opacity-50">
                Убрать фото
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={changeAvatar} />
          </div>
        ) : (
          <p className="text-xs text-fg/40">Фото группы меняют владелец и администраторы</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg/30">Название</label>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          readOnly={!canManage || isLocalChat}
          maxLength={100}
          className="w-full rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-4 py-2.5 text-sm text-fg/85 outline-none focus:border-purple-500/40 read-only:opacity-70"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg/30">Описание</label>
        <textarea
          value={groupDesc}
          onChange={(e) => setGroupDesc(e.target.value)}
          readOnly={!canManage || isLocalChat}
          maxLength={300}
          rows={3}
          placeholder={canManage ? "О чём эта группа" : "Описания нет"}
          className="w-full resize-none rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-4 py-2.5 text-sm text-fg/85 outline-none placeholder:text-fg/25 focus:border-purple-500/40 read-only:opacity-70"
        />
      </div>
      {canManage && !isLocalChat && (
        <button onClick={saveInfo} disabled={busy} className="w-full rounded-2xl gradient-btn py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Сохраняем..." : "Сохранить"}
        </button>
      )}
      {!isLocalChat && (
        <button
          onClick={() => setConfirm({ kind: "leave" })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20"
        >
          <Icon name="LogOut" size={14} />
          Покинуть группу
        </button>
      )}
    </div>
  );
}