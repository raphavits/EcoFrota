import type { Metadata } from "next";
import { RouteChooser } from "@/components/RouteChooser";
import { DRIVER_ID } from "@/lib/config";
import { compareRoutes } from "@/lib/emissions";
import { listRoutes } from "@/lib/services";

export const metadata: Metadata = { title: "Rotas" };
export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const routes = (await listRoutes()).map((r) => ({ ...r, comparison: compareRoutes(r.current, r.alternative) }));
  return <RouteChooser routes={routes} driverId={DRIVER_ID} />;
}
