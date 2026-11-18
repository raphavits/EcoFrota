import type { Metadata } from "next";
import { deleteVehicle } from "@/app/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { VehicleForm } from "@/components/forms";
import Link from "next/link";
import { signed } from "@/lib/format";
import { listVehicles, managerSummary } from "@/lib/services";

export const metadata: Metadata = { title: "Frota" };
export const dynamic = "force-dynamic";

export default async function FleetPage({ searchParams }: PageProps<"/gestor/frota">) {
  const { editar } = await searchParams;
  const [vehicles, m] = await Promise.all([listVehicles(), managerSummary()]);
  const editing = vehicles.find((v) => v.id === editar);
  const status = new Map(m.fleet.map((f) => [f.id, f]));

  return (
    <>
      <p className="eyebrow">{vehicles.length} veículos cadastrados</p>
      <h1 className="title">Frota</h1>
      <div className="stack">
        <section className="card">
          <div className="seg-scroll">
            <table className="table">
              <thead><tr><th>Veículo</th><th>Motorista</th><th>Esperado</th><th>vs. esperado</th><th /></tr></thead>
              <tbody>
                {vehicles.map((v) => {
                  const st = status.get(v.id);
                  return (
                    <tr key={v.id}>
                      <td><b>{v.code}</b></td>
                      <td>{st?.driver ?? "—"}</td>
                      <td>{String(v.expectedKgPerKm).replace(".", ",")} kg/km</td>
                      <td>
                        <span className={`tag${st?.alert ? " warn" : ""}`}>
                          {st?.deviationPct == null ? "sem dados" : `${signed(st.deviationPct)}%`}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link className="btn small ghost" href={`/gestor/frota?editar=${v.id}`}>Editar</Link>
                          <DeleteButton action={deleteVehicle} id={v.id} confirmText={`Excluir o veículo ${v.code}? O motorista dele ficará sem veículo.`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {vehicles.length === 0 ? <tr><td colSpan={5}>Nenhum veículo. Cadastre abaixo.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        {m.alerts.map((a) => <div key={a.vehicle} className="alert" role="alert">⚠ {a.message}</div>)}
        <VehicleForm key={editing?.id ?? "novo"} vehicle={editing} />
        <p className="eyebrow">Emissão por km nos últimos 14 dias. Acima de 15% do esperado: checar regulagem do motor, calibragem dos pneus e sistema de injeção.</p>
      </div>
    </>
  );
}
