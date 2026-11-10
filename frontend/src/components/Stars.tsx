export default function Stars({ n, size = "text-lg" }: { n: number; size?: string }) {
  return (
    <span className={`${size} leading-none text-amber-500`} role="img" aria-label={`${n} / 5`}>
      {"★".repeat(n)}<span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}
