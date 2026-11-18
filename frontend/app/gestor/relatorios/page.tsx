import type { Metadata } from "next";
import { PrintButton } from "@/components/PrintButton";
import { kg } from "@/lib/format";
import { listDrivers, managerSummary } from "@/lib/services";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [m, drivers] = await Promise.all([managerSummary(), listDrivers()]);
  const baseline = m.emittedKg + m.avoidedKg;
  const reduction = baseline ? Math.round((m.avoidedKg / baseline) * 100) : 0;
  return (
    <>
      <p className="eyebrow">Relatório ESG · últimos {m.period.days} dias</p>
      <h1 className="title">Relatórios</h1>
      <div className="stack">
        <section className="card">
          <p className="label">Redução frente ao cenário de referência</p>
          <p className="hero-num">−{reduction}%</p>
          <p className="eyebrow">{kg(m.avoidedKg)} kg de CO₂ evitados de {kg(baseline)} kg projetados</p>
          {m.goalPct !== null ? (
            <>
              <div className="meter"><i style={{ width: `${Math.min(m.goalPct, 100)}%` }} /></div>
              <p className="eyebrow" style={{ marginTop: 6 }}>{m.goalPct}% da meta mensal atingida</p>
            </>
          ) : null}
        </section>
        <section className="card">
          <p className="label">Ranking completo</p>
          <ol className="rank">
            {m.ranking.map((r) => (
              <li key={r.driverId}>
                <span className="n">{String(r.position).padStart(2, "0")}</span>
                <span className="name">{r.name}</span>
                <span className="pct">{r.changePct > 0 ? "+" : ""}{r.changePct}% CO₂</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <p className="label">Emitir relatório</p>
          <div className="actions no-print" style={{ marginTop: 12 }}>
            <a className="btn" href="/api/relatorios/pdf?tipo=frota" download>Baixar PDF da frota (ESG)</a>
            <a className="btn ghost" href="/api/relatorios/csv" download>Baixar CSV</a>
            <PrintButton />
          </div>
          <form action="/api/relatorios/pdf" method="get" className="report-driver no-print">
            <input type="hidden" name="tipo" value="motorista" />
            <label className="field">PDF por motorista
              <select name="id" required>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <button className="btn small" disabled={drivers.length === 0}>Baixar PDF</button>
          </form>
        </section>
      </div>
    </>
  );
}
