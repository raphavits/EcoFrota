import type { Metadata } from "next";
import { Bars } from "@/components/Bars";
import { kg } from "@/lib/format";
import { managerSummary } from "@/lib/services";

export const metadata: Metadata = { title: "Painel do gestor" };
export const dynamic = "force-dynamic";

export default async function ManagerPanel() {
  const m = await managerSummary();
  return (
    <>
      <p className="eyebrow">Frota — últimos {m.period.days} dias</p>
      <h1 className="title">Painel do gestor</h1>

      <div className="row3 kpis stack">
        <section className="card kpi"><p className="label">CO₂ emitido</p><p className="val warn">{kg(m.emittedKg)} <span className="unit">kg</span></p></section>
        <section className="card kpi"><p className="label">CO₂ evitado</p><p className="val">{kg(m.avoidedKg)} <span className="unit">kg</span></p></section>
        {m.goalPct !== null ? (
          <section className="card kpi desk-only">
            <p className="label">Meta do mês</p>
            <p className="val">{m.goalPct}%</p>
            <div className="meter"><i style={{ width: `${Math.min(m.goalPct, 100)}%` }} /></div>
          </section>
        ) : null}
      </div>

      <div className="grid-main">
        <section className="card">
          <p className="label">Evolução — últimas 6 semanas</p>
          <Bars values={m.weeklyEmitted.map((w) => w.emittedKg)} labels={m.weeklyEmitted.map((w) => w.label)} />
        </section>
        <section className="card">
          <p className="label">Ranking ambiental</p>
          <ol className="rank">
            {m.ranking.slice(0, 3).map((r) => (
              <li key={r.driverId}>
                <span className="n">{String(r.position).padStart(2, "0")}</span>
                <span className="name">{r.name}</span>
                <span className="pct">{r.changePct}% CO₂</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div style={{ marginTop: 14 }}>
        {m.alerts.map((a) => <div key={a.vehicle} className="alert" role="alert">⚠ {a.message}</div>)}
      </div>
    </>
  );
}
