import { useEffect } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { Capacitor } from "@capacitor/core";
import Icon from "@/components/ui/icon";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) navigate("/app", { replace: true });
  }, [navigate]);

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#140a2e] font-golos">
      <div
        aria-hidden
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
        style={{ backgroundImage: "url(/landing-bg.jpg)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-contain bg-center bg-no-repeat md:bg-cover"
        style={{ backgroundImage: "url(/landing-bg.jpg)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0b0618] via-[#0b0618]/70 to-transparent"
      />

      <h1 className="sr-only">Трынделка — мессенджер</h1>

      <div
        className="relative z-10 mt-auto flex flex-col items-center gap-5 px-5 text-center"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <p className="max-w-xl text-balance text-lg font-semibold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-2xl">
          Трынделка — болтай без забот: быстро, просто и по-своему
        </p>

        <Link
          to="/app"
          className="gradient-btn inline-flex h-14 min-w-[220px] items-center justify-center gap-2 rounded-2xl px-10 text-lg font-bold text-white shadow-xl shadow-purple-500/40 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-purple-500/50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Поехали
          <Icon name="Rocket" fallback="ArrowRight" size={20} />
        </Link>
      </div>
    </main>
  );
}
