import type { Metadata } from "next";
import { PrintButton } from "@/components/PrintButton";
import { getManagerSummary } from "@/lib/api";
import { kg } from "@/lib/format";

export const metadata: Metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  const m = await getManagerSummary();
  const baseline = m.emitted_kg + m.avoided_kg;
  const reduction = baseline ? Math.round((m.avoided_kg / baseline) * 100) : 0;
  return (
    <>
      <p className="eyebrow">Relatório ESG · últimos {m.period.days} dias</p>
      <h1 className="title">Relatórios</h1>
      <div className="stack">
        <section className="card">
          <p className="label">Redução frente ao cenário de referência</p>
          <p className="hero-num">−{reduction}%</p>
          <p className="eyebrow">{kg(m.avoided_kg)} kg de CO₂ evitados de {kg(baseline)} kg projetados</p>
          {m.goal_pct !== null ? (
            <>
              <div className="meter"><i style={{ width: `${Math.min(m.goal_pct, 100)}%` }} /></div>
              <p className="eyebrow" style={{ marginTop: 6 }}>{m.goal_pct}% da meta mensal atingida</p>
            </>
          ) : null}
        </section>
        <section className="card">
          <p className="label">Ranking completo</p>
          <ol className="rank">
            {m.ranking.map((r) => (
              <li key={r.driver_id}>
                <span className="n">{String(r.position).padStart(2, "0")}</span>
                <span className="name">{r.name}</span>
                <span className="pct">{r.change_pct > 0 ? "+" : ""}{r.change_pct}% CO₂</span>
              </li>
            ))}
          </ol>
        </section>
        <div className="actions no-print">
          <a className="btn" href="/api/manager/report.csv" download>Baixar CSV</a>
          <PrintButton />
        </div>
      </div>
    </>
  );
}
