"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveDriver, saveVehicle, type FormState } from "@/app/actions";
import type { Driver, Vehicle } from "@/lib/types";

const initial: FormState = {};

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const [state, action, pending] = useActionState(saveVehicle, initial);
  return (
    <form action={action} className="card form">
      <h3>{vehicle ? `Editar ${vehicle.code}` : "Novo veículo"}</h3>
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
      <div className="form-grid">
        <label className="field">Código (placa ou frota)
          <input name="code" defaultValue={vehicle?.code} placeholder="TQ-15" required minLength={2} maxLength={20} />
        </label>
        <label className="field">Emissão esperada (kg CO₂ por km)
          <input name="expectedKgPerKm" type="number" step="0.001" min="0.05" max="1" defaultValue={vehicle?.expectedKgPerKm ?? 0.231} required />
        </label>
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <div className="form-actions">
        <button className="btn small" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
        {vehicle ? <Link className="btn small ghost" href="/gestor/frota">Cancelar</Link> : null}
      </div>
    </form>
  );
}

export function DriverForm({ driver, vehicles, takenVehicleIds }: { driver?: Driver; vehicles: Vehicle[]; takenVehicleIds: string[] }) {
  const [state, action, pending] = useActionState(saveDriver, initial);
  return (
    <form action={action} className="card form">
      <h3>{driver ? `Editar ${driver.name}` : "Novo motorista"}</h3>
      {driver ? <input type="hidden" name="id" value={driver.id} /> : null}
      <div className="form-grid">
        <label className="field">Nome
          <input name="name" defaultValue={driver?.name} required minLength={2} maxLength={80} />
        </label>
        <label className="field">Veículo
          <select name="vehicleId" defaultValue={driver?.vehicleId ?? ""}>
            <option value="">Sem veículo</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id} disabled={takenVehicleIds.includes(v.id) && v.id !== driver?.vehicleId}>
                {v.code}{takenVehicleIds.includes(v.id) && v.id !== driver?.vehicleId ? " (em uso)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">Dias sem frenagem brusca
          <input name="daysWithoutHardBraking" type="number" min={0} max={3650} step={1} defaultValue={driver?.daysWithoutHardBraking ?? 0} required />
        </label>
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <div className="form-actions">
        <button className="btn small" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
        {driver ? <Link className="btn small ghost" href="/gestor/motoristas">Cancelar</Link> : null}
      </div>
    </form>
  );
}
