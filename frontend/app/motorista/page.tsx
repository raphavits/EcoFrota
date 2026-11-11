import type { Metadata } from "next";
import Link from "next/link";
import { Bars } from "@/components/Bars";
import { getDriverSummary } from "@/lib/api";
import { kg, longDate, weekdayInitial } from "@/lib/format";

export const metadata: Metadata = { title: "Início" };

export default async function DriverHome() {
  const s = await getDriverSummary();
  const { today } = s;
  const date = longDate(today.date);
  const first = s.badges.find((b) => b.unlocked);

  return (
    <>
      <p className="eyebrow">
        Olá, {s.driver.name.split(" ")[0]}
        <span className="desk-inline"> · {date.toLowerCase()}</span>
      </p>
      <h1 className="title">
        <span className="mob-only">{date}</span>
        <span className="desk-only">Seu impacto ambiental hoje</span>
      </h1>

      <div className="driver-top stack">
        <section className="card" aria-label="CO₂ hoje versus referência">
          <p className="label">CO₂ hoje vs. referência</p>
          <p className="hero-num">−{today.reduction_pct}%</p>
          <p className="eyebrow">
            {kg(today.emitted_kg)} kg emitidos · {kg(today.avoided_kg)} kg evitados
          </p>
        </section>
        <div className="row2 driver-stats">
          <div className="card tint stat"><b>{today.routes}</b><span className="label">Rotas hoje</span></div>
          <div className="card tint stat"><b>{today.empty_trips}</b><span className="label">Trajeto vazio</span></div>
        </div>
      </div>

      <div className="grid-main">
        <section className="card desk-only" aria-label="Evolução">
          <p className="label">Evolução — últimos 6 dias</p>
          <Bars
            values={s.daily_emitted.map((d) => d.emitted_kg)}
            labels={s.daily_emitted.map((d) => weekdayInitial(d.date))}
          />
        </section>
        {first ? (
          <section className="card badge" aria-label="Selo conquistado">
            <span className="ico" aria-hidden="true">★</span>
            <div><b>Selo: {first.name}</b><small>{first.description}</small></div>
          </section>
        ) : null}
      </div>

      <div className="actions">
        <Link className="btn" href="/motorista/rotas">Iniciar próxima rota</Link>
      </div>
    </>
  );
}
