"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="stack">
      <h1 className="title">Não foi possível carregar</h1>
      <p className="eyebrow">Confira se o backend Django está rodando (porta 8000) e tente de novo.</p>
      <button className="btn" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
