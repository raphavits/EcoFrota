"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RouteMap } from "@/components/RouteMap";
import type { RouteData, RouteOptionData } from "@/lib/api";
import { kg, signed } from "@/lib/format";

type Choice = "alternative" | "current";

function Metrics({ o }: { o: RouteOptionData }) {
  return (
    <div className="route-metrics">
      <div><b>{o.distance_km} km</b><span>distância</span></div>
      <div><b>{o.duration_min} min</b><span>tempo</span></div>
      <div><b>{kg(o.co2_kg, 1)} kg</b><span>CO₂</span></div>
    </div>
  );
}

export function RouteChooser({ routes, driverId }: { routes: RouteData[]; driverId: number }) {
  const router = useRouter();
  const [slug, setSlug] = useState(routes[0]?.slug);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const route = routes.find((r) => r.slug === slug);

  if (!route) return <p className="eyebrow">Nenhuma rota cadastrada.</p>;

  async function choose(choice: Choice) {
    if (!route) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver: driverId, route: route.id, choice }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body: { co2_avoided_kg: number; new_badges: { name: string }[] } = await res.json();
      const badge = body.new_badges[0] ? ` · novo selo: ${body.new_badges[0].name}` : "";
      setMessage(
        choice === "alternative"
          ? `Rota alternativa ativada · ${kg(body.co2_avoided_kg, 1)} kg de CO₂ evitados${badge}`
          : "Rota atual mantida",
      );
      setTimeout(() => {
        router.push("/motorista");
        router.refresh();
      }, 1200);
    } catch {
      setBusy(false);
      setMessage("Não foi possível registrar a rota. Tente novamente.");
    }
  }

  return (
    <>
      <p className="eyebrow">{route.label}</p>
      <h1 className="title">Rota sugerida</h1>

      <div className="route-pick" role="group" aria-label="Escolher trajeto">
        {routes.map((r) => (
          <button key={r.slug} type="button" className="chip" aria-pressed={r.slug === slug} onClick={() => setSlug(r.slug)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="routes-layout">
        <RouteMap />
        <div className="stack">
          <section className="card">
            <h3>Rota atual</h3>
            <Metrics o={route.current} />
          </section>
          <section className="card sel">
            <h3>Rota alternativa</h3>
            <Metrics o={route.alternative} />
            <p className="gain">−{route.co2_saved_pct}% de CO₂ · {signed(route.extra_minutes)} min</p>
          </section>
          <p className="eyebrow">
            A alternativa evita vias congestionadas e trechos de para-e-siga, reduzindo o consumo de diesel do caminhão-tanque.
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="btn" disabled={busy} onClick={() => choose("alternative")}>Usar rota alternativa</button>
        <button className="btn ghost" disabled={busy} onClick={() => choose("current")}>Manter rota atual</button>
      </div>

      <div className={`toast${message ? " show" : ""}`} role="status" aria-live="polite">{message}</div>
    </>
  );
}
