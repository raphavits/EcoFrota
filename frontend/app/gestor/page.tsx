import type { Metadata } from "next";
import { Bars } from "@/components/Bars";
import { getManagerSummary } from "@/lib/api";
import { kg } from "@/lib/format";

export const metadata: Metadata = { title: "Painel do gestor" };

export default async function ManagerPanel() {
  const m = await getManagerSummary();
  return (
    <>
      <p className="eyebrow">Frota — últimos {m.period.days} dias</p>
      <h1 className="title">Painel do gestor</h1>

      <div className="row3 kpis stack">
        <section className="card kpi"><p className="label">CO₂ emitido</p><p className="val warn">{kg(m.emitted_kg)} <span className="unit">kg</span></p></section>
        <section className="card kpi"><p className="label">CO₂ evitado</p><p className="val">{kg(m.avoided_kg)} <span className="unit">kg</span></p></section>
        {m.goal_pct !== null ? (
          <section className="card kpi desk-only">
            <p className="label">Meta do mês</p>
            <p className="val">{m.goal_pct}%</p>
            <div className="meter"><i style={{ width: `${Math.min(m.goal_pct, 100)}%` }} /></div>
          </section>
        ) : null}
      </div>

      <div className="grid-main">
        <section className="card">
          <p className="label">Evolução — últimas 6 semanas</p>
          <Bars values={m.weekly_emitted.map((w) => w.emitted_kg)} labels={m.weekly_emitted.map((w) => w.label)} />
        </section>
        <section className="card">
          <p className="label">Ranking ambiental</p>
          <ol className="rank">
            {m.ranking.slice(0, 3).map((r) => (
              <li key={r.driver_id}>
                <span className="n">{String(r.position).padStart(2, "0")}</span>
                <span className="name">{r.name}</span>
                <span className="pct">{r.change_pct}% CO₂</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div style={{ marginTop: 14 }}>
        {m.alerts.map((a) => (
          <div key={a.vehicle} className="alert" role="alert">⚠ {a.message}</div>
        ))}
      </div>
    </>
  );
}
