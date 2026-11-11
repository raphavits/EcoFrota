import type { Metadata } from "next";
import { getDriverSummary } from "@/lib/api";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const s = await getDriverSummary();
  return (
    <>
      <p className="eyebrow">{s.driver.vehicle}</p>
      <h1 className="title">{s.driver.name}</h1>
      <div className="stack">
        <section className="card">
          <p className="label">Rotas alternativas escolhidas</p>
          <p className="hero-num">{s.alternative_routes_chosen}</p>
        </section>
        <section className="card">
          <p className="label">Selos</p>
          <div className="stack" style={{ marginTop: 12 }}>
            {s.badges.map((b) => (
              <div key={b.slug} className={`badge${b.unlocked ? "" : " locked"}`}>
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
