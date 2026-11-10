import { Component, type ErrorInfo, type ReactNode } from "react";

/** Last line of defence: a render error shows a friendly screen with a reload button instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("UI error:", error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: ".5rem" }}>Something went wrong</h1>
          <p style={{ opacity: 0.75, marginBottom: "1.25rem" }}>The page hit an unexpected error. Your data is safe. Please reload and try again.</p>
          <button onClick={() => window.location.reload()} style={{ padding: ".65rem 1.25rem", borderRadius: 12, border: 0, background: "#1f6b3a", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Reload page</button>
        </div>
      </div>
    );
  }
}
