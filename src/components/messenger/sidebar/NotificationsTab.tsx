import Icon from "@/components/ui/icon";
import { Tab, NotificationItem } from "../types";

interface NotificationsTabProps {
  activeTab: Tab;
  notifications: NotificationItem[];
}

export default function NotificationsTab({ activeTab, notifications }: NotificationsTabProps) {
  if (activeTab !== "notifications") return null;

  return (
    <div className="animate-fade-in space-y-2">
      <p className="text-xs text-fg/30 font-medium mb-3 px-1">УВЕДОМЛЕНИЯ</p>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Icon name="BellOff" size={22} className="text-fg/15" />
          <p className="text-xs text-fg/25">Пока нет уведомлений</p>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className={`flex gap-3 rounded-2xl p-3 border transition-all ${
              n.read ? "bg-fg/[0.02] border-fg/[0.04]" : "bg-fg/[0.05] border-fg/[0.08]"
            }`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${n.color}22`, border: `1px solid ${n.color}33` }}
            >
              <Icon name={n.icon} size={16} style={{ color: n.color }} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-fg/75 leading-relaxed">{n.text}</p>
              <p className="text-[11px] text-fg/25 mt-1">{n.time}</p>
            </div>
            {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-400" />}
          </div>
        ))
      )}
    </div>
  );
}
