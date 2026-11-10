import { animate, m, useInView, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/** Fades + lifts its children in once when they scroll into view (instant when the user prefers reduced motion). */
export function Reveal({ children, delay = 0, y = 18, className, as = "div", labelledBy }: { children: ReactNode; delay?: number; y?: number; className?: string; labelledBy?: string; as?: "div" | "li" | "article" | "section" }) {
  const M = m[as] as typeof m.div;
  return (
    <M className={className} aria-labelledby={labelledBy} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}

/** Animated number that counts up when first visible; always ends on the exact real value. */
export function CountUp({ value, className }: { value: number | undefined; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (value === undefined) return;
    if (reduce || !seen) { mv.set(value); return; }
    const c = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => c.stop();
  }, [value, seen, reduce, mv]);
  if (value === undefined) return <span className={className}>–</span>;
  return <m.span ref={ref} className={className}>{text}</m.span>;
}

/** Card with a soft green/gold glow that follows the pointer. Flat: no tilt, no 3-D, nothing flips. */
export function SpotlightCard({ children, className = "", ...rest }: { children: ReactNode; className?: string } & Omit<HTMLMotionProps<"div">, "children" | "className">) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`); el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };
  return <m.div ref={ref} onPointerMove={move} className={`spot ${className}`} {...rest}>{children}</m.div>;
}

/** Endless horizontal ticker. Pauses on hover/focus; static and wrapped when reduced motion is requested. */
export function Marquee({ children, label }: { children: ReactNode[]; label: string }) {
  return (
    <div className="marquee" role="group" aria-label={label}>
      <ul className="marquee-track">{children.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <ul className="marquee-track" aria-hidden="true">{children.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );
}
