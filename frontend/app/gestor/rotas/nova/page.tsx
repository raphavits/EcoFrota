import type { Metadata } from "next";
import { RouteForm } from "@/components/RouteForm";

export const metadata: Metadata = { title: "Nova rota" };

export default function NewRoutePage() {
  return (
    <>
      <p className="eyebrow">Rotas</p>
      <h1 className="title">Nova rota</h1>
      <div style={{ marginTop: 16 }}><RouteForm /></div>
    </>
  );
}
