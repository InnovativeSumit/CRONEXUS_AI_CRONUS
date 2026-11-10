import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { Tag, PageHeader, useAsync } from "../components/ui";
import { api } from "../api";

type Kind = "ml" | "api" | "rules" | "data";
const KIND: Record<Kind, { label: string; tone: "green" | "amber" | "slate" }> = {
  ml: { label: "Trained ML model", tone: "green" }, api: { label: "External data / API", tone: "amber" }, rules: { label: "Rules & formulas", tone: "slate" }, data: { label: "Curated data", tone: "slate" },
};
const ROWS: { feature: string; kind: Kind; how: string }[] = [
  { feature: "AI Crop Prediction", kind: "ml", how: "A Random Forest classifier trained on soil nutrients (N, P, K), pH and weather values. The training data mixes real Kaggle records with some synthetic rows for a few crops; the Model details page shows which crops are which." },
  { feature: "Plant Disease Detector", kind: "ml", how: "A convolutional neural network (TensorFlow/Keras) trained on labelled leaf photos. It suggests the most likely disease, with a confidence score, and cannot replace an expert." },
  { feature: "Soil Health — photo", kind: "ml", how: "A small TensorFlow CNN trained on a public soil-photo dataset to guess the broad soil type. It is experimental and has low accuracy (see below)." },
  { feature: "Soil Health — test values", kind: "rules", how: "Your typed-in N, P, K, organic carbon, pH and EC are compared with general Soil-Health-Card style ranges. No model is involved, and nothing is inferred from the photo." },
  { feature: "Live Weather", kind: "api", how: "Forecasts and place search come from Open-Meteo. The farm insights (heat, frost, rain, wind, irrigation) are simple threshold rules applied to that forecast." },
  { feature: "Water Management", kind: "rules", how: "The FAO-56 method: reference evapotranspiration (from Open-Meteo) × crop coefficient (Kc) minus useful rain, tracked against the soil's available water. It is a model, not a moisture measurement." },
  { feature: "Crop Calendar", kind: "data", how: "Your own tasks, stored in your account. Nothing is predicted." },
  { feature: "Products", kind: "data", how: "A hand-checked catalogue (products.json) of real products with links to sellers' pages. CropNexus does not sell products." },
  { feature: "Farming Resources", kind: "api", how: "Scheme details are curated from official government pages and link back to them; news headlines come from publishers' public RSS feeds." },
];

export default function About() {
  const { user } = useAuth();
  const s = useAsync(() => api.modelSummary(), []);
  const m = s.data;
  const pct = (v?: number | null) => (v ? `${(v * 100).toFixed(1)}%` : "not available");
  return (
    <>
      <PageHeader icon="🌾" title="About CropNexus" lead="CropNexus brings crop advice, plant-health checks, weather, water planning and farm records into one place for farmers." />
      <section className="grid gap-5 md:grid-cols-2" aria-labelledby="ab-what">
        <div className="card"><h2 id="ab-what" className="!mt-0 !text-xl">What it does</h2>
          <p className="text-sm">Tell CropNexus about your soil and location and it suggests suitable crops, checks leaf photos for disease, shows the weather, plans irrigation, helps you schedule field work and points you to government schemes.</p>
          <p className="text-sm">It is a decision-support tool. It does not replace a local agriculture officer, a soil-testing laboratory or your own experience — confirm important decisions before acting on them.</p></div>
        <div className="card"><h2 className="!mt-0 !text-xl">Measured model accuracy</h2>
          <table className="kv"><tbody>
            <tr><td>Crop prediction ({m?.cropCount ?? "–"} crops)</td><td>{pct(m?.cropAccuracy)}</td></tr>
            <tr><td>Plant disease ({m?.leafClasses ?? "–"} classes)</td><td>{pct(m?.leafAccuracy)}</td></tr>
            <tr><td>Soil photo ({m?.soilClasses ?? "–"} types, experimental)</td><td>{pct(m?.soilAccuracy)}</td></tr>
          </tbody></table>
          <p className="muted text-xs">Figures are measured on held-out test data from each model's training run, read live from the model service. Accuracy on photos taken in real fields is usually lower than on clean test images. The soil-photo model is only a rough hint — see the Soil Health page.</p>
          {user && <p className="m-0 text-sm"><Link to="/model-details">Full model details →</Link></p>}</div>
      </section>

      <h2>How each feature works</h2>
      <div className="card overflow-x-auto !p-0">
        <table className="data min-w-[40rem]"><caption className="sr-only">Technology behind each feature</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Built with</th><th scope="col">How it works</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r.feature}><th scope="row" className="text-left align-top font-semibold">{r.feature}</th><td className="align-top"><Tag tone={KIND[r.kind].tone}>{KIND[r.kind].label}</Tag></td><td className="text-sm">{r.how}</td></tr>)}</tbody></table>
      </div>

      <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="Limitations and data sources">
        <div className="card"><h2 className="!mt-0 !text-xl">Honest limitations</h2>
          <ul className="m-0 grid gap-1.5 pl-5 text-sm">
            <li>Predictions are statistical estimates, not guarantees.</li>
            <li>Some crops in the crop model were trained partly on synthetic data because no suitable real data was available.</li>
            <li>Disease and soil photo models can be wrong, especially with poor light, unusual angles or plants outside their training set.</li>
            <li>Weather forecasts change. Water and weather insights are rule-based estimates.</li>
            <li>The product and scheme lists are curated by hand and may be out of date — always check the official or seller page.</li>
          </ul></div>
        <div className="card"><h2 className="!mt-0 !text-xl">Data sources &amp; credits</h2>
          <ul className="m-0 grid gap-1.5 pl-5 text-sm">
            <li>Weather and place search: <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0).</li>
            <li>Irrigation method: <a href="https://www.fao.org/4/x0490e/x0490e00.htm" target="_blank" rel="noopener noreferrer">FAO Irrigation and Drainage Paper 56</a>.</li>
            <li>Training data and licences are listed in <code>docs/DATA_SOURCES.md</code> in the project.</li>
          </ul>
          <p className="muted mt-3 text-xs">Questions or corrections? <Link to="/contact">Contact us</Link>.</p></div>
      </section>
    </>
  );
}
