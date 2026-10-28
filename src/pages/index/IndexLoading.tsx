export default function IndexLoading() {
  return (
    <div className="screen-full relative flex w-full items-center justify-center overflow-hidden bg-background font-golos">
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
