import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteForm } from "@/components/RouteForm";
import { getRoute } from "@/lib/services";

export const metadata: Metadata = { title: "Editar rota" };
export const dynamic = "force-dynamic";

export default async function EditRoutePage({ params }: PageProps<"/gestor/rotas/[id]">) {
  const { id } = await params;
  const route = await getRoute(id);
  if (!route) notFound();
  return (
    <>
      <p className="eyebrow">Rotas</p>
      <h1 className="title">{route.origin} → {route.destination}</h1>
      <div style={{ marginTop: 16 }}><RouteForm route={route} /></div>
    </>
  );
}
