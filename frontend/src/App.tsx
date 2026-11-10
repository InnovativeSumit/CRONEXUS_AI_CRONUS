import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { useAuth } from "./auth";
import { useI18n } from "./i18n";
import { Loading } from "./components/ui";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Landing from "./pages/Landing";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Advisory = lazy(() => import("./pages/Advisory"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Forgot = lazy(() => import("./pages/Forgot"));
const Leaf = lazy(() => import("./pages/Leaf"));
const Profile = lazy(() => import("./pages/Profile"));
const Reset = lazy(() => import("./pages/Reset"));
const About = lazy(() => import("./pages/About"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const Contact = lazy(() => import("./pages/Contact"));
const Products = lazy(() => import("./pages/Products"));
const Resources = lazy(() => import("./pages/Resources"));
const Soil = lazy(() => import("./pages/Soil"));
const Water = lazy(() => import("./pages/Water"));
const Weather = lazy(() => import("./pages/Weather"));
const NotFound = lazy(() => import("./pages/NotFound"));
const History = lazy(() => import("./pages/Info").then((m) => ({ default: m.History })));
const ModelDetails = lazy(() => import("./pages/Info").then((m) => ({ default: m.ModelDetails })));

function Protected({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const loc = useLocation();
  if (!ready) return <Loading label={t("common_loading")} />;
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}
function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { user, ready } = useAuth();
  const { pathname } = useLocation();
  return (
    <>
      <ScrollToTop />
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main" tabIndex={-1} key={pathname} className="container page-enter flex-1 pb-12 outline-none">
        <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={!ready ? null : user ? <Home /> : <Landing />} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password" element={<Reset />} />
          <Route path="/advisory" element={<Protected><Advisory /></Protected>} />
          <Route path="/leaf-disease" element={<Protected><Leaf /></Protected>} />
          <Route path="/history" element={<Protected><History /></Protected>} />
          <Route path="/feedback" element={<Protected><Feedback /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/model-details" element={<Protected><ModelDetails /></Protected>} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/products" element={<Products />} />
          <Route path="/water" element={<Water />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />
          <Route path="/soil" element={<Protected><Soil /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
