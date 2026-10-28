import { Tab } from "../types";

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

interface GalleryTabProps {
  activeTab: Tab;
}

export default function GalleryTab({ activeTab }: GalleryTabProps) {
  if (activeTab !== "gallery") return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-fg/30 font-medium">МЕДИАФАЙЛЫ</p>
        <div className="flex gap-2 text-xs">
          <button className="text-fg/60 border-b border-purple-400 pb-0.5">Всё</button>
          <button className="text-fg/30 hover:text-fg/60 transition-colors">Фото</button>
          <button className="text-fg/30 hover:text-fg/60 transition-colors">GIF</button>
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
  );
}
