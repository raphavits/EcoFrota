import type { Metadata } from "next";
import Link from "next/link";
import { Bars } from "@/components/Bars";
import { NoData } from "@/components/NoData";
import { DRIVER_ID } from "@/lib/config";
import { kg, longDate, weekdayInitial } from "@/lib/format";
import { driverSummary } from "@/lib/services";

export const metadata: Metadata = { title: "Início" };
export const dynamic = "force-dynamic";

export default async function DriverHome() {
  const s = await driverSummary(DRIVER_ID);
  if (!s) return <NoData what="O motorista" />;
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
          <p className="hero-num">−{today.reductionPct}%</p>
          <p className="eyebrow">{kg(today.emittedKg)} kg emitidos · {kg(today.avoidedKg)} kg evitados</p>
        </section>
        <div className="row2 driver-stats">
          <div className="card tint stat"><b>{today.routes}</b><span className="label">Rotas hoje</span></div>
          <div className="card tint stat"><b>{today.emptyTrips}</b><span className="label">Trajeto vazio</span></div>
        </div>
      </div>

      <div className="grid-main">
        <section className="card desk-only" aria-label="Evolução">
          <p className="label">Evolução — últimos 6 dias</p>
          <Bars values={s.dailyEmitted.map((d) => d.emittedKg)} labels={s.dailyEmitted.map((d) => weekdayInitial(d.date))} />
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
