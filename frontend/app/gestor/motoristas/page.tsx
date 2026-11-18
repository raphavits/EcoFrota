import type { Metadata } from "next";
import Link from "next/link";
import { deleteDriver } from "@/app/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { DriverForm } from "@/components/forms";
import { BADGES } from "@/lib/types";
import { listDrivers, listVehicles } from "@/lib/services";

export const metadata: Metadata = { title: "Motoristas" };
export const dynamic = "force-dynamic";

export default async function DriversPage({ searchParams }: PageProps<"/gestor/motoristas">) {
  const { editar } = await searchParams;
  const [drivers, vehicles] = await Promise.all([listDrivers(), listVehicles()]);
  const editing = drivers.find((d) => d.id === editar);
  const code = new Map(vehicles.map((v) => [v.id, v.code]));
  const taken = drivers.flatMap((d) => (d.vehicleId ? [d.vehicleId] : []));

  return (
    <>
      <p className="eyebrow">{drivers.length} motoristas cadastrados</p>
      <h1 className="title">Motoristas</h1>
      <div className="stack">
        <section className="card">
          <div className="seg-scroll">
            <table className="table">
              <thead><tr><th>Nome</th><th>Veículo</th><th>Sem frenagem brusca</th><th>Selos</th><th /></tr></thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.name}</b></td>
                    <td>{d.vehicleId ? (code.get(d.vehicleId) ?? "—") : "—"}</td>
                    <td>{d.daysWithoutHardBraking} dias</td>
                    <td>{d.badges.map((b) => BADGES.find((x) => x.id === b)?.name).filter(Boolean).join(", ") || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn small ghost" href={`/gestor/motoristas?editar=${d.id}`}>Editar</Link>
                        <DeleteButton action={deleteDriver} id={d.id} confirmText={`Excluir ${d.name}? O histórico de viagens dele deixa de aparecer nos rankings.`} />
                      </div>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 ? <tr><td colSpan={5}>Nenhum motorista. Cadastre abaixo.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        <DriverForm key={editing?.id ?? "novo"} driver={editing} vehicles={vehicles} takenVehicleIds={taken} />
      </div>
    </>
  );
}
