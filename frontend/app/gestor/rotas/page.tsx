import type { Metadata } from "next";
import Link from "next/link";
import { deleteRoute } from "@/app/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { compareRoutes } from "@/lib/emissions";
import { kg } from "@/lib/format";
import { listRoutes } from "@/lib/services";

export const metadata: Metadata = { title: "Rotas" };
export const dynamic = "force-dynamic";

export default async function RoutesAdminPage() {
  const routes = await listRoutes();
  return (
    <>
      <p className="eyebrow">{routes.length} rotas estabelecidas (ruas fictícias)</p>
      <h1 className="title">Rotas</h1>
      <div className="stack">
        <section className="card">
          <div className="seg-scroll">
            <table className="table">
              <thead><tr><th>Trajeto</th><th>Atual</th><th>Alternativa</th><th>Economia</th><th /></tr></thead>
              <tbody>
                {routes.map((r) => {
                  const c = compareRoutes(r.current, r.alternative);
                  return (
                    <tr key={r.id}>
                      <td><b>{r.origin} → {r.destination}</b></td>
                      <td>{c.current.distanceKm} km · {c.current.durationMin} min · {kg(c.current.co2Kg, 1)} kg</td>
                      <td>{c.alternative.distanceKm} km · {c.alternative.durationMin} min · {kg(c.alternative.co2Kg, 1)} kg</td>
                      <td><span className={`tag${c.co2SavedPct <= 0 ? " warn" : ""}`}>{c.co2SavedPct >= 0 ? "−" : "+"}{Math.abs(c.co2SavedPct)}% CO₂</span></td>
                      <td>
                        <div className="row-actions">
                          <Link className="btn small ghost" href={`/gestor/rotas/${r.id}`}>Editar</Link>
                          <DeleteButton action={deleteRoute} id={r.id} confirmText={`Excluir a rota ${r.origin} → ${r.destination}?`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {routes.length === 0 ? <tr><td colSpan={5}>Nenhuma rota. Cadastre a primeira.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        <Link className="btn small" href="/gestor/rotas/nova" style={{ width: "fit-content" }}>+ Nova rota</Link>
        <p className="eyebrow">Cada rota é uma lista de trechos (rua, km, velocidade, trânsito e paradas). O CO₂ e o tempo são calculados a partir deles, sem usar API de mapas.</p>
      </div>
    </>
  );
}
