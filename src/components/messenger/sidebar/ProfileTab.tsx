import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Tab, AuthUser } from "../types";
import SettingsPanels, { SettingsSection } from "./SettingsPanels";
import { API_CHATS, API_AUTH } from "@/pages/index/config";
import { useAppearance } from "@/hooks/use-appearance";

interface ProfileTabProps {
  activeTab: Tab;
  chats: Chat[];
  authUser: AuthUser | null;
  onUpdateProfile: (login: string, firstName: string, lastName: string) => Promise<string | null>;
  onLogout: () => void;
  onAvatarUpdated: (user: AuthUser) => void;
  onSetChatNotify: (chatId: number, enabled: boolean) => void;
  onMoodSaved?: (mood: { moodEmoji: string; moodText: string; bio: string }) => void;
}

export default function ProfileTab({
  activeTab,
  chats,
  authUser,
  onUpdateProfile,
  onLogout,
  onAvatarUpdated,
  onSetChatNotify,
  onMoodSaved,
}: ProfileTabProps) {
  const [login, setLogin] = useState(authUser?.login || "");
  const [firstName, setFirstName] = useState(authUser?.firstName || "");
  const [lastName, setLastName] = useState(authUser?.lastName || "");
  const [moodEmoji, setMoodEmoji] = useState(authUser?.moodEmoji || "");
  const [moodText, setMoodText] = useState(authUser?.moodText || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);
  const [moodError, setMoodError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<SettingsSection | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const { appearance } = useAppearance();

  useEffect(() => {
    if (activeTab !== "profile") setSection(null);
  }, [activeTab]);

  useEffect(() => {
    setLogin(authUser?.login || "");
    setFirstName(authUser?.firstName || "");
    setLastName(authUser?.lastName || "");
    setMoodEmoji(authUser?.moodEmoji || "");
    setMoodText(authUser?.moodText || "");
    setBio(authUser?.bio || "");
  }, [authUser]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    const err = await onUpdateProfile(login.trim(), firstName.trim(), lastName.trim());
    setSaving(false);
    if (err) {
      setSaveError(err);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !authUser) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Выберите файл изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Изображение должно быть меньше 5 МБ");
      return;
    }

    setAvatarError("");
    setAvatarUploading(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": authUser.sessionId },
        body: JSON.stringify({ action: "upload-avatar", imageBase64: base64, contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error || "Не удалось загрузить фото");
        return;
      }
      onAvatarUpdated(data.user);
    } catch {
      setAvatarError("Не удалось загрузить фото");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveMood = async () => {
    if (!authUser) return;
    setMoodSaving(true);
    setMoodError("");
    try {
      const res = await fetch(`${API_CHATS}?action=update-mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": authUser.sessionId },
        body: JSON.stringify({ moodEmoji: moodEmoji.trim(), moodText: moodText.trim(), bio: bio.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMoodError(data.error || "Не удалось сохранить");
        return;
      }
      onMoodSaved?.({ moodEmoji: data.moodEmoji, moodText: data.moodText, bio: data.bio });
      setMoodSaved(true);
      window.setTimeout(() => setMoodSaved(false), 2000);
    } catch {
      setMoodError("Не удалось связаться с сервером");
    } finally {
      setMoodSaving(false);
    }
  };

  if (activeTab !== "profile") return null;

  if (section) {
    return (
      <SettingsPanels section={section} authUser={authUser} onBack={() => setSection(null)} chats={chats} onSetChatNotify={onSetChatNotify} />
    );
  }

  return (
    <div className="animate-fade-in mx-auto w-full max-w-md pb-4">
      <div className="flex flex-col items-center pt-2 pb-5 text-center">
        <div className="relative mb-3">
          {authUser?.avatarUrl ? (
            <img
              src={authUser.avatarUrl}
              alt={authUser.displayName}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl object-cover shadow-xl shadow-purple-500/30"
            />
          ) : (
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl gradient-btn text-2xl sm:text-3xl font-black text-white shadow-xl shadow-purple-500/30">
              {authUser?.avatarInitials || "ВА"}
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Сменить фото"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-background border border-fg/10 text-fg/60 hover:text-foreground transition-all disabled:opacity-50"
          >
            <Icon name={avatarUploading ? "Loader" : "Camera"} size={14} className={avatarUploading ? "animate-spin" : ""} />
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </div>
        {avatarError && <p className="text-xs text-red-400 mb-1 max-w-full break-words">{avatarError}</p>}
        <h2 className="max-w-full truncate text-base font-bold text-fg/90">{authUser?.displayName || "Ваше Имя"}</h2>
        <p className="max-w-full truncate text-xs text-fg/40 mt-0.5">{authUser?.email || "@me"}</p>
        <div className="mt-2 flex max-w-full items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-3 py-1">
          <Icon name="Shield" size={12} className="shrink-0 text-emerald-400" />
          <span className="truncate text-[11px] text-emerald-500 font-medium">E2E шифрование активно</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-fg/40 font-medium mb-2 px-1">ДАННЫЕ ПРОФИЛЯ</p>
        <div className="flex items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5 focus-within:border-purple-500/40 transition-all">
          <Icon name="AtSign" size={14} className="text-fg/40 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-fg/85 placeholder:text-fg/30 outline-none min-w-0"
            placeholder="Логин"
            autoCapitalize="none"
            autoCorrect="off"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5 focus-within:border-purple-500/40 transition-all">
            <input
              className="flex-1 bg-transparent text-sm text-fg/85 placeholder:text-fg/30 outline-none min-w-0"
              placeholder="Имя"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5 focus-within:border-purple-500/40 transition-all">
            <input
              className="flex-1 bg-transparent text-sm text-fg/85 placeholder:text-fg/30 outline-none min-w-0"
              placeholder="Фамилия"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        {saveError && <p className="text-xs text-red-400 px-1 break-words">{saveError}</p>}
        <button
          onClick={handleSave}
          disabled={saving || !authUser}
          className="w-full rounded-2xl gradient-btn text-white text-sm font-medium py-3 sm:py-2.5 transition-all disabled:opacity-40 hover:-translate-y-0.5"
        >
          {saving ? <Icon name="Loader" size={14} className="animate-spin mx-auto" /> : saved ? "Сохранено ✓" : "Сохранить профиль"}
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-fg/40 font-medium mb-2 px-1">НАСТРОЕНИЕ И О СЕБЕ</p>
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {["😊", "😎", "🥳", "😴", "🤔", "😍", "🔥", "💪", "🎧", "☕", "🏖️", "🚗"].map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setMoodEmoji(moodEmoji === e ? "" : e)}
              aria-label={`Настроение ${e}`}
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all ${
                moodEmoji === e ? "bg-purple-500/25 ring-1 ring-purple-400/60" : "bg-fg/[0.05] hover:bg-fg/[0.1]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5 focus-within:border-purple-500/40 transition-all">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-lg">{moodEmoji || "🙂"}</span>
          <input
            className="flex-1 bg-transparent text-sm text-fg/85 placeholder:text-fg/30 outline-none min-w-0"
            placeholder="Что у вас сейчас? Например: на работе"
            maxLength={80}
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
          />
        </div>
        <textarea
          className="w-full resize-none rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5 text-sm text-fg/85 placeholder:text-fg/30 outline-none focus:border-purple-500/40 transition-all"
          placeholder="Коротко о себе (до 200 символов)"
          maxLength={200}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="px-1 text-right text-[10px] text-fg/30">{bio.length}/200</p>
        {moodError && <p className="text-xs text-red-400 px-1 break-words">{moodError}</p>}
        <button
          onClick={saveMood}
          disabled={moodSaving || !authUser}
          className="w-full rounded-2xl gradient-btn text-white text-sm font-medium py-3 sm:py-2.5 transition-all disabled:opacity-40 hover:-translate-y-0.5"
        >
          {moodSaving ? <Icon name="Loader" size={14} className="animate-spin mx-auto" /> : moodSaved ? "Сохранено ✓" : "Сохранить настроение"}
        </button>
      </div>

      <p className="text-xs text-fg/40 font-medium mb-1 px-1">НАСТРОЙКИ</p>
      {([
        { id: "notifications", icon: "Bell", label: "Уведомления", desc: "Колокольчик, звук, браузер" },
        { id: "privacy", icon: "Shield", label: "Приватность", desc: "Статус, «печатает», прочтение" },
        { id: "appearance", icon: "Palette", label: "Оформление", desc: `Тема: ${appearance.theme === "dark" ? "тёмная" : appearance.theme === "light" ? "светлая" : "системная"}` },
      ] as { id: SettingsSection; icon: string; label: string; desc: string }[]).map((item) => (
        <button
          key={item.id}
          onClick={() => setSection(item.id)}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[56px] text-left hover:bg-fg/[0.05] active:bg-fg/[0.08] transition-all group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fg/[0.05] border border-fg/[0.06] text-fg/55 group-hover:text-purple-400 transition-colors">
            <Icon name={item.icon} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg/85 truncate">{item.label}</p>
            <p className="text-xs text-fg/40 truncate">{item.desc}</p>
          </div>
          <Icon name="ChevronRight" size={14} className="shrink-0 text-fg/25 group-hover:text-fg/50 transition-colors" />
        </button>
      ))}

      <button
        onClick={() => setHelpOpen((v) => !v)}
        className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[56px] text-left hover:bg-fg/[0.05] transition-all group"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fg/[0.05] border border-fg/[0.06] text-fg/55 group-hover:text-purple-400 transition-colors">
          <Icon name="HelpCircle" size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg/85">Помощь</p>
          <p className="text-xs text-fg/40 truncate">FAQ и поддержка</p>
        </div>
        <Icon name={helpOpen ? "ChevronUp" : "ChevronDown"} size={14} className="shrink-0 text-fg/25" />
      </button>
      {helpOpen && (
        <div className="mx-1 mb-2 space-y-2 rounded-2xl bg-fg/[0.04] border border-fg/[0.06] p-3 text-xs leading-relaxed text-fg/60 animate-fade-in">
          <p>Нажмите на сообщение правой кнопкой мыши (на телефоне удерживайте палец), чтобы ответить, изменить, закрепить, переслать или удалить его.</p>
          <p>Поиск по переписке открывается лупой в шапке чата.</p>
          <p>Тему и размер текста можно поменять в разделе «Оформление».</p>
        </div>
      )}

      {authUser && (
        <button
          onClick={onLogout}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-red-400/30 py-3 min-h-[48px] text-sm text-red-500/80 hover:text-red-500 hover:border-red-400/60 transition-all"
        >
          <Icon name="LogOut" size={14} />
          Выйти из аккаунта
        </button>
      )}
    </div>
  );
}
