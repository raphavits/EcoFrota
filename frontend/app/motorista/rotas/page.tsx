import type { Metadata } from "next";
import { RouteChooser } from "@/components/RouteChooser";
import { DRIVER_ID, getRoutes } from "@/lib/api";

export const metadata: Metadata = { title: "Rotas" };

export default async function RoutesPage() {
  const routes = await getRoutes();
  return <RouteChooser routes={routes} driverId={DRIVER_ID} />;
}
