"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { registerTripAction } from "@/app/actions";
import { RouteMap } from "@/components/RouteMap";
import type { RouteMetrics, Segment } from "@/lib/types";
import { kg, signed } from "@/lib/format";

export type ChooserRoute = {
  id: string;
  origin: string;
  destination: string;
  current: Segment[];
  alternative: Segment[];
  comparison: { current: RouteMetrics; alternative: RouteMetrics; co2SavedPct: number; extraMinutes: number };
};

function Metrics({ m }: { m: RouteMetrics }) {
  return (
    <div className="route-metrics">
      <div><b>{m.distanceKm} km</b><span>distância</span></div>
      <div><b>{m.durationMin} min</b><span>tempo</span></div>
      <div><b>{kg(m.co2Kg, 1)} kg</b><span>CO₂</span></div>
    </div>
  );
}

function Streets({ segments }: { segments: Segment[] }) {
  return (
    <details className="streets">
      <summary>Ver ruas do trajeto</summary>
      <ol>
        {segments.map((s, i) => (
          <li key={i}>
            <b>{s.street}</b> · {kg(s.km, 1)} km · {s.traffic}{s.stops ? ` · ${s.stops} paradas` : ""}
          </li>
        ))}
      </ol>
    </details>
  );
}

export function RouteChooser({ routes, driverId }: { routes: ChooserRoute[]; driverId: string }) {
  const router = useRouter();
  const origins = useMemo(() => [...new Set(routes.map((r) => r.origin))], [routes]);
  const [origin, setOrigin] = useState(origins[0] ?? "");
  const destinations = routes.filter((r) => r.origin === origin);
  const [routeId, setRouteId] = useState(destinations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const route = routes.find((r) => r.id === routeId) ?? destinations[0];

  if (!route) return <p className="eyebrow">Nenhuma rota cadastrada. Peça ao gestor para cadastrar em Rotas.</p>;
  const c = route.comparison;

  function changeOrigin(next: string) {
    setOrigin(next);
    setRouteId(routes.find((r) => r.origin === next)?.id ?? "");
  }

  async function choose(choice: "alternative" | "current") {
    setBusy(true);
    setMessage(null);
    const res = await registerTripAction(driverId, route.id, choice);
    if ("error" in res && res.error) {
      setBusy(false);
      setMessage(res.error);
      return;
    }
    const badge = "newBadges" in res && res.newBadges?.length ? ` · novo selo: ${res.newBadges[0]}` : "";
    setMessage(choice === "alternative" ? `Rota alternativa ativada · ${kg(res.co2AvoidedKg ?? 0, 1)} kg de CO₂ evitados${badge}` : "Rota atual mantida");
    setTimeout(() => router.push("/motorista"), 1200);
  }

  return (
    <>
      <p className="eyebrow">{route.origin} → {route.destination}</p>
      <h1 className="title">Rota sugerida</h1>

      <div className="route-select">
        <label className="field">Origem
          <select value={origin} onChange={(e) => changeOrigin(e.target.value)}>
            {origins.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="field">Destino
          <select value={route.id} onChange={(e) => setRouteId(e.target.value)}>
            {destinations.map((r) => <option key={r.id} value={r.id}>{r.destination}</option>)}
          </select>
        </label>
      </div>

      <div className="routes-layout">
        <RouteMap />
        <div className="stack">
          <section className="card">
            <h3>Rota atual</h3>
            <Metrics m={c.current} />
            <Streets segments={route.current} />
          </section>
          <section className="card sel">
            <h3>Rota alternativa</h3>
            <Metrics m={c.alternative} />
            <p className={`gain${c.co2SavedPct < 0 ? " neg" : ""}`}>
              {c.co2SavedPct >= 0 ? "−" : "+"}{Math.abs(c.co2SavedPct)}% de CO₂ · {signed(c.extraMinutes)} min
            </p>
            <Streets segments={route.alternative} />
          </section>
          <p className="eyebrow">O cálculo soma os trechos de cada rota: distância, tempo (com trânsito e paradas) e CO₂ (velocidade e para-e-siga aumentam o consumo).</p>
        </div>
      </div>

      <div className="actions">
        <button className="btn" disabled={busy || c.co2SavedPct <= 0} onClick={() => choose("alternative")}>Usar rota alternativa</button>
        <button className="btn ghost" disabled={busy} onClick={() => choose("current")}>Manter rota atual</button>
      </div>

      <div className={`toast${message ? " show" : ""}`} role="status" aria-live="polite">{message}</div>
    </>
  );
}
