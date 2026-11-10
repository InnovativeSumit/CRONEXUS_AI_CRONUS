import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => { document.title = "Page not found · CropNexus"; }, []);
  return (
    <section className="container py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-500">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn't find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-slate-300">The link may be old or mistyped. Head back home and pick a feature from the menu.</p>
      <Link to="/" className="btn btn-primary mt-6 inline-flex">Back to home</Link>
    </section>
  );
}
