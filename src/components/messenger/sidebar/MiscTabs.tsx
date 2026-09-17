import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Tab, AuthUser } from "../types";

const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";

const NOTIFICATIONS = [
  { id: 1, icon: "MessageCircle", text: "Алиса прислала 3 новых сообщения", time: "сейчас", color: "#a855f7" },
  { id: 2, icon: "Users", text: "Дмитрий добавил вас в группу «Проект Альфа»", time: "13:00", color: "#38bdf8" },
  { id: 3, icon: "Heart", text: "Мария отреагировала на ваше сообщение", time: "Вт", color: "#ec4899" },
  { id: 4, icon: "Shield", text: "Сквозное шифрование активно для всех чатов 🔒", time: "Вс", color: "#34d399" },
];

const GALLERY_ITEMS = [
  { id: 1, type: "photo", bg: "linear-gradient(135deg, #a855f7, #ec4899)" },
  { id: 2, type: "photo", bg: "linear-gradient(135deg, #38bdf8, #6366f1)" },
  { id: 3, type: "gif", bg: "linear-gradient(135deg, #f59e0b, #ef4444)" },
  { id: 4, type: "photo", bg: "linear-gradient(135deg, #34d399, #38bdf8)" },
  { id: 5, type: "gif", bg: "linear-gradient(135deg, #ec4899, #a855f7)" },
  { id: 6, type: "photo", bg: "linear-gradient(135deg, #6366f1, #34d399)" },
  { id: 7, type: "gif", bg: "linear-gradient(135deg, #38bdf8, #ec4899)" },
  { id: 8, type: "photo", bg: "linear-gradient(135deg, #a855f7, #38bdf8)" },
  { id: 9, type: "photo", bg: "linear-gradient(135deg, #f59e0b, #a855f7)" },
];

interface MiscTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  setActiveChatId: (id: number) => void;
  chats: Chat[];
  authUser: AuthUser | null;
  onUpdateProfile: (login: string, firstName: string, lastName: string) => Promise<string | null>;
  onLogout: () => void;
  onAvatarUpdated: (user: AuthUser) => void;
}

export default function MiscTabs({
  activeTab,
  setActiveTab,
  setActiveChatId,
  chats,
  authUser,
  onUpdateProfile,
  onLogout,
  onAvatarUpdated,
}: MiscTabsProps) {
  const [login, setLogin] = useState(authUser?.login || "");
  const [firstName, setFirstName] = useState(authUser?.firstName || "");
  const [lastName, setLastName] = useState(authUser?.lastName || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogin(authUser?.login || "");
    setFirstName(authUser?.firstName || "");
    setLastName(authUser?.lastName || "");
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

  return (
    <>
      {/* NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="animate-fade-in space-y-2">
          <p className="text-xs text-white/30 font-medium mb-3 px-1">УВЕДОМЛЕНИЯ</p>
          {NOTIFICATIONS.map((n) => (
            <div key={n.id} className="flex gap-3 rounded-2xl p-3 bg-white/[0.03] border border-white/[0.05]">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${n.color}22`, border: `1px solid ${n.color}33` }}
              >
                <Icon name={n.icon} size={16} style={{ color: n.color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/75 leading-relaxed">{n.text}</p>
                <p className="text-[11px] text-white/25 mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GALLERY */}
      {activeTab === "gallery" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-white/30 font-medium">МЕДИАФАЙЛЫ</p>
            <div className="flex gap-2 text-xs">
              <button className="text-white/60 border-b border-purple-400 pb-0.5">Всё</button>
              <button className="text-white/30 hover:text-white/60 transition-colors">Фото</button>
              <button className="text-white/30 hover:text-white/60 transition-colors">GIF</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="aspect-square rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform"
                style={{ background: item.bg }}
              >
                {item.type === "gif" && (
                  <span className="absolute top-1 left-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">GIF</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH */}
      {activeTab === "search" && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-3 mb-4">
            <Icon name="Search" size={16} className="text-purple-400" />
            <input
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
              placeholder="Поиск пользователей..."
              autoFocus
            />
          </div>
          <p className="text-xs text-white/25 px-1 mb-3">РЕКОМЕНДАЦИИ</p>
          {chats.slice(0, 4).map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-white/[0.04] cursor-pointer transition-all"
              onClick={() => { setActiveChatId(c.id); setActiveTab("chats"); }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
              >
                {c.avatar}
              </div>
              <span className="text-sm text-white/60">{c.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* PROFILE */}
      {activeTab === "profile" && (
        <div className="animate-fade-in">
          <div className="flex flex-col items-center pt-2 pb-5">
            <div className="relative mb-3">
              {authUser?.avatarUrl ? (
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.displayName}
                  className="h-20 w-20 rounded-3xl object-cover shadow-xl shadow-purple-500/30"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-btn text-2xl font-black text-white shadow-xl shadow-purple-500/30">
                  {authUser?.avatarInitials || "ВА"}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background border border-white/10 text-white/60 hover:text-white transition-all disabled:opacity-50"
              >
                <Icon name={avatarUploading ? "Loader" : "Camera"} size={12} className={avatarUploading ? "animate-spin" : ""} />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </div>
            {avatarError && <p className="text-xs text-red-400 mb-1">{avatarError}</p>}
            <h2 className="text-base font-bold text-white/90">{authUser?.displayName || "Ваше Имя"}</h2>
            <p className="text-xs text-white/35 mt-0.5">{authUser?.email || "@me"}</p>
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-3 py-1">
              <Icon name="Shield" size={12} className="text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">E2E шифрование активно</span>
            </div>
          </div>

          {/* Editable profile fields */}
          <div className="space-y-2 mb-4">
            <p className="text-xs text-white/30 font-medium mb-2 px-1">ДАННЫЕ ПРОФИЛЯ</p>
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
              <Icon name="AtSign" size={14} className="text-white/30 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none min-w-0"
                placeholder="Логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                <input
                  className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none min-w-0"
                  placeholder="Имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="flex-1 flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                <input
                  className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none min-w-0"
                  placeholder="Фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            {saveError && <p className="text-xs text-red-400 px-1">{saveError}</p>}
            <button
              onClick={handleSave}
              disabled={saving || !authUser}
              className="w-full rounded-2xl gradient-btn text-white text-sm font-medium py-2.5 transition-all disabled:opacity-40 hover:-translate-y-0.5"
            >
              {saving ? <Icon name="Loader" size={14} className="animate-spin mx-auto" /> : saved ? "Сохранено ✓" : "Сохранить профиль"}
            </button>
          </div>

          {[
            { icon: "Bell", label: "Уведомления", desc: "Настроить оповещения" },
            { icon: "Shield", label: "Приватность", desc: "Шифрование и безопасность" },
            { icon: "Palette", label: "Оформление", desc: "Тема и акценты" },
            { icon: "HelpCircle", label: "Помощь", desc: "FAQ и поддержка" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] cursor-pointer transition-all group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-white/50 group-hover:text-purple-400 transition-colors">
                <Icon name={item.icon} size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">{item.label}</p>
                <p className="text-xs text-white/30">{item.desc}</p>
              </div>
              <Icon name="ChevronRight" size={14} className="ml-auto text-white/20 group-hover:text-white/40 transition-colors" />
            </div>
          ))}

          {authUser && (
            <button
              onClick={onLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-red-400/30 py-3 text-sm text-red-400/70 hover:text-red-400 hover:border-red-400/60 transition-all"
            >
              <Icon name="LogOut" size={14} />
              Выйти из аккаунта
            </button>
          )}
        </div>
      )}
    </>
  );
}