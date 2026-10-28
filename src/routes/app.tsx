import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

function AppPending() {
  return (
    <div className="screen-full relative flex w-full items-center justify-center overflow-hidden bg-background font-golos">
      <h1 className="sr-only">Трынделка — мессенджер</h1>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-purple-400/50 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/app")({
  ssr: false,
  pendingComponent: AppPending,
  component: Index,
});
