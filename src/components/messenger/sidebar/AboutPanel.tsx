import Icon from "@/components/ui/icon";

export const APP_VERSION = "1.4.0";

const LICENSE_URL = "/licenses/fluent-emoji-MIT.txt";

interface AboutPanelProps {
  onBack: () => void;
}

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">
    {children}
  </a>
);

export default function AboutPanel({ onBack }: AboutPanelProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 px-1 py-1 text-xs text-fg/45 hover:text-fg/80 transition-colors">
        <Icon name="ChevronLeft" size={14} />
        Назад
      </button>

      <div className="flex flex-col items-center gap-2 rounded-2xl bg-fg/[0.04] border border-fg/[0.06] px-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-btn text-white shadow-lg shadow-purple-500/20">
          <Icon name="MessageCircle" size={26} />
        </div>
        <p className="text-base font-bold text-fg/90">Трынделка</p>
        <p className="text-xs text-fg/45">Версия {APP_VERSION}</p>
      </div>

      <div className="space-y-2 rounded-2xl bg-fg/[0.04] border border-fg/[0.06] p-4 text-xs leading-relaxed text-fg/60">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg/35">Авторы стикеров и GIF</p>

        <p>
          <span className="font-semibold text-fg/80">Стикеры.</span> 3D-стикеры из набора{" "}
          <ExternalLink href="https://github.com/microsoft/fluentui-emoji">Fluent Emoji</ExternalLink>, © Microsoft Corporation. Распространяются по лицензии MIT.
          Размер изображений уменьшен, формат изменён на WebP.{" "}
          <ExternalLink href={LICENSE_URL}>Текст лицензии</ExternalLink>
        </p>

        <p>
          <span className="font-semibold text-fg/80">Анимированные GIF.</span> Анимации из набора{" "}
          <ExternalLink href="https://googlefonts.github.io/noto-emoji-animation/">Animated Noto Emoji</ExternalLink>, © Google LLC. Распространяются по лицензии{" "}
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>. Файлы изменены: уменьшены по размеру и сжаты для быстрой загрузки.
        </p>

        <p className="text-fg/40">Авторы не связаны с этим приложением и не рекомендуют его.</p>
      </div>
    </div>
  );
}
