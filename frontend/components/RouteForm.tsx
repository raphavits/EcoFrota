"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveRoute, type FormState } from "@/app/actions";
import { compareRoutes } from "@/lib/emissions";
import type { Route, Segment, Traffic } from "@/lib/types";

type Row = { street: string; km: string; speedKmh: string; traffic: Traffic; stops: string };

const toRows = (segs: Segment[]): Row[] =>
  segs.map((s) => ({ street: s.street, km: String(s.km), speedKmh: String(s.speedKmh), traffic: s.traffic, stops: String(s.stops) }));
const toSegments = (rows: Row[]): Segment[] =>
  rows.map((r) => ({ street: r.street, km: Number(r.km), speedKmh: Number(r.speedKmh), traffic: r.traffic, stops: Number(r.stops) }));
const blank = (): Row => ({ street: "", km: "", speedKmh: "60", traffic: "livre", stops: "0" });
const valid = (rows: Row[]) => rows.length > 0 && rows.every((r) => r.street.trim() && Number(r.km) > 0 && Number(r.speedKmh) >= 10 && Number.isInteger(Number(r.stops)) && Number(r.stops) >= 0);

function SegmentEditor({ title, rows, onChange }: { title: string; rows: Row[]; onChange: (r: Row[]) => void }) {
  const set = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="seg-editor">
      <legend>{title}</legend>
      <div className="seg-scroll">
        <table className="table seg-table">
          <thead>
            <tr><th>Rua</th><th>Km</th><th>Vel. (km/h)</th><th>Trânsito</th><th title="Semáforos, cruzamentos e lombadas">Paradas</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><input aria-label="Rua" value={r.street} onChange={(e) => set(i, { street: e.target.value })} placeholder="Avenida das Flores" /></td>
                <td><input aria-label="Distância em km" type="number" step="0.1" min="0.1" value={r.km} onChange={(e) => set(i, { km: e.target.value })} /></td>
                <td><input aria-label="Velocidade da via" type="number" min="10" max="120" value={r.speedKmh} onChange={(e) => set(i, { speedKmh: e.target.value })} /></td>
                <td>
                  <select aria-label="Trânsito" value={r.traffic} onChange={(e) => set(i, { traffic: e.target.value as Traffic })}>
                    <option value="livre">Livre</option><option value="moderado">Moderado</option><option value="intenso">Intenso</option>
                  </select>
                </td>
                <td><input aria-label="Paradas" type="number" min="0" max="100" step="1" value={r.stops} onChange={(e) => set(i, { stops: e.target.value })} /></td>
                <td><button type="button" className="btn small ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remover trecho ${i + 1}`}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn small ghost" onClick={() => onChange([...rows, blank()])}>+ Adicionar trecho</button>
    </fieldset>
  );
}

const initial: FormState = {};

export function RouteForm({ route }: { route?: Route }) {
  const [state, action, pending] = useActionState(saveRoute, initial);
  const [origin, setOrigin] = useState(route?.origin ?? "");
  const [destination, setDestination] = useState(route?.destination ?? "");
  const [current, setCurrent] = useState<Row[]>(route ? toRows(route.current) : [blank()]);
  const [alternative, setAlternative] = useState<Row[]>(route ? toRows(route.alternative) : [blank()]);

  const preview = useMemo(
    () => (valid(current) && valid(alternative) ? compareRoutes(toSegments(current), toSegments(alternative)) : null),
    [current, alternative],
  );

  return (
    <form action={action} className="stack">
      {route ? <input type="hidden" name="id" value={route.id} /> : null}
      <input type="hidden" name="current" value={JSON.stringify(toSegments(current))} />
      <input type="hidden" name="alternative" value={JSON.stringify(toSegments(alternative))} />
      <div className="card form">
        <div className="form-grid">
          <label className="field">Origem<input name="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Centro" required /></label>
          <label className="field">Destino<input name="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Zona Sul" required /></label>
        </div>
      </div>
      <SegmentEditor title="Rota atual (trajeto habitual)" rows={current} onChange={setCurrent} />
      <SegmentEditor title="Rota alternativa (menor emissão)" rows={alternative} onChange={setAlternative} />

      <section className="card tint" aria-live="polite">
        <p className="label">Cálculo em tempo real</p>
        {preview ? (
          <div className="row2" style={{ marginTop: 8 }}>
            <div>
              <h3>Atual</h3>
              <p>{preview.current.distanceKm} km · {preview.current.durationMin} min · {preview.current.co2Kg.toFixed(1).replace(".", ",")} kg CO₂</p>
            </div>
            <div>
              <h3>Alternativa</h3>
              <p>{preview.alternative.distanceKm} km · {preview.alternative.durationMin} min · {preview.alternative.co2Kg.toFixed(1).replace(".", ",")} kg CO₂</p>
              <p className={`gain${preview.co2SavedKg < 0 ? " neg" : ""}`}>
                {preview.co2SavedKg >= 0 ? "−" : "+"}{Math.abs(preview.co2SavedPct)}% de CO₂ · {preview.extraMinutes >= 0 ? "+" : "−"}{Math.abs(preview.extraMinutes)} min
              </p>
            </div>
          </div>
        ) : (
          <p className="eyebrow">Preencha os trechos das duas rotas para ver distância, tempo e CO₂.</p>
        )}
      </section>

      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <div className="form-actions">
        <button className="btn small" disabled={pending}>{pending ? "Salvando…" : "Salvar rota"}</button>
        <Link className="btn small ghost" href="/gestor/rotas">Cancelar</Link>
      </div>
    </form>
  );
}
