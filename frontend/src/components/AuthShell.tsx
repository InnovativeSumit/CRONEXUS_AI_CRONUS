import type { ReactNode } from "react";

/** Centres its content horizontally and vertically in the space between the fixed header and the footer. */
export default function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth-shell">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} transition-[max-width] duration-300`}>{children}</div>
    </div>
  );
}
