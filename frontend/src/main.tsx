import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./auth";
import { I18nProvider } from "./i18n";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <LazyMotion features={domMax} strict><MotionConfig reducedMotion="user"><App /></MotionConfig></LazyMotion>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
