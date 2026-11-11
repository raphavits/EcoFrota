"use client";

export function PrintButton() {
  return <button className="btn ghost" onClick={() => window.print()}>Imprimir / salvar PDF</button>;
}
