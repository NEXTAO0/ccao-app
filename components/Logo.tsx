export function Logo({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`group inline-flex cursor-pointer items-center gap-2.5 font-mono transition-all duration-200 hover:scale-105 hover:text-orange-500 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] active:scale-95 active:rotate-[-2deg] ${className ?? ""}`}
      aria-label="CCAO: by NEXTAO"
    >
      <span className="flex flex-col leading-none">
        <span className="flex items-center gap-1 text-lg font-bold tracking-wider text-zinc-100 transition-colors duration-200 group-hover:text-orange-500">
          CCAO
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" aria-hidden="true" />
        </span>
        <span className="mt-1 block text-[10px] font-mono tracking-widest text-zinc-500">BY NEXTAO</span>
      </span>
    </div>
  );
}