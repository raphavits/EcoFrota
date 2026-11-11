import type { Metadata } from "next";
import { getFleet, getManagerSummary } from "@/lib/api";
import { signed } from "@/lib/format";

export const metadata: Metadata = { title: "Frota" };

export default async function FleetPage() {
  const [fleet, m] = await Promise.all([getFleet(), getManagerSummary()]);
  return (
    <>
      <p className="eyebrow">{fleet.length} veículos monitorados</p>
      <h1 className="title">Frota</h1>
      <div className="stack">
        <section className="card">
          <table className="table">
            <thead><tr><th>Veículo</th><th>Motorista</th><th>vs. esperado</th></tr></thead>
            <tbody>
              {fleet.map((v) => (
                <tr key={v.vehicle}>
                  <td><b>{v.vehicle}</b></td>
                  <td>{v.driver ?? "—"}</td>
                  <td>
                    <span className={`tag${v.alert ? " warn" : ""}`}>
                      {v.deviation_pct === null ? "sem dados" : `${signed(v.deviation_pct)}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {m.alerts.map((a) => (
          <div key={a.vehicle} className="alert" role="alert">⚠ {a.message}</div>
        ))}
        <p className="eyebrow">Emissão por km nos últimos 14 dias. Acima do limite: checar regulagem do motor, calibragem dos pneus e sistema de injeção.</p>
      </div>
    </>
  );
}
