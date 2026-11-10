import { Landmark, Leaf, Wheat, CloudSun, CalendarDays, ShoppingBasket, Droplets, Layers, Search, MapPin, Mail, Newspaper, Plug, Hourglass, ChartColumn, Minus, Scale, Sprout, Mountain, type LucideIcon } from "lucide-react";

/** One place that decides which lucide icon stands for each feature / legacy emoji, so the whole app looks consistent. */
export const FEATURE_ICON: Record<string, LucideIcon> = {
  leaf: Leaf, crop: Wheat, weather: CloudSun, calendar: CalendarDays,
  products: ShoppingBasket, soil: Layers, water: Droplets, resources: Landmark,
};
const EMOJI: Record<string, LucideIcon> = {
  "🗓️": CalendarDays, "🪱": Layers, "🔌": Plug, "🔍": Search, "⏳": Hourglass, "📊": ChartColumn, "➖": Minus,
  "⚖️": Scale, "⛅": CloudSun, "📍": MapPin, "✉️": Mail, "🏛️": Landmark, "📰": Newspaper, "💧": Droplets, "🛒": ShoppingBasket, "🌾": Wheat,
  "🌱": Sprout, "🍃": Leaf, "⛰️": Mountain,
};
/** Renders a lucide icon for a feature id or a legacy emoji string (falls back to a sprout). */
export function Glyph({ name, className = "size-5", strokeWidth = 1.9 }: { name: string; className?: string; strokeWidth?: number }) {
  const I = FEATURE_ICON[name] ?? EMOJI[name] ?? Sprout;
  return <I className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
