import { buildDriverReport, buildFleetReport } from "@/lib/pdf";
import { driverSummary, driverTrips, listRoutes, managerSummary } from "@/lib/services";
import { todayBR } from "@/lib/dates";

export const dynamic = "force-dynamic";

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tipo = params.get("tipo") ?? "frota";
  const today = todayBR();

  if (tipo === "frota") {
    return pdfResponse(await buildFleetReport(await managerSummary()), `ecofrota-esg-${today}.pdf`);
  }

  if (tipo === "motorista") {
    const id = params.get("id") ?? "";
    const summary = await driverSummary(id);
    if (!summary) return new Response("Motorista não encontrado.", { status: 404 });
    const [trips, routes] = await Promise.all([driverTrips(id, 30), listRoutes()]);
    const routeName = new Map(routes.map((r) => [r.id, `${r.origin} -> ${r.destination}`]));
    const bytes = await buildDriverReport({
      name: summary.driver.name,
      vehicle: summary.driver.vehicle,
      today: summary.today,
      badges: summary.badges,
      alternativeRoutesChosen: summary.alternativeRoutesChosen,
      trips: trips.map((t) => ({
        date: t.date,
        route: (t.routeId && routeName.get(t.routeId)) || "Rota removida",
        choice: t.choice,
        distanceKm: t.distanceKm,
        durationMin: t.durationMin,
        co2Kg: t.co2Kg,
        co2AvoidedKg: t.co2AvoidedKg,
      })),
      days: 30,
    });
    return pdfResponse(bytes, `ecofrota-${summary.driver.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today}.pdf`);
  }

  return new Response("Tipo de relatório inválido (use frota ou motorista).", { status: 400 });
}
