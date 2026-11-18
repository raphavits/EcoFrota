import type { Metadata } from "next";
import { NoData } from "@/components/NoData";
import { DRIVER_ID } from "@/lib/config";
import { driverSummary } from "@/lib/services";

export const metadata: Metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const s = await driverSummary(DRIVER_ID);
  if (!s) return <NoData what="O motorista" />;
  return (
    <>
      <p className="eyebrow">{s.driver.vehicle ?? "Sem veículo"}</p>
      <h1 className="title">{s.driver.name}</h1>
      <div className="stack">
        <section className="card">
          <p className="label">Rotas alternativas escolhidas</p>
          <p className="hero-num">{s.alternativeRoutesChosen}</p>
        </section>
        <section className="card">
          <p className="label">Selos</p>
          <div className="stack" style={{ marginTop: 12 }}>
            {s.badges.map((b) => (
              <div key={b.id} className={`badge${b.unlocked ? "" : " locked"}`}>
                <span className="ico" aria-hidden="true">{b.unlocked ? "★" : "☆"}</span>
                <div><b>{b.name}</b><small>{b.description}</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
