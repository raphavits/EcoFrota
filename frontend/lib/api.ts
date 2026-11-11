// Cliente tipado da API Django, usado nos Server Components (roda no servidor Next).

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export const DRIVER_ID = Number(process.env.DRIVER_ID ?? 1);

export type RouteOptionData = { distance_km: number; duration_min: number; co2_kg: number };

export type RouteData = {
  id: number;
  slug: string;
  label: string;
  origin: string;
  destination: string;
  current: RouteOptionData;
  alternative: RouteOptionData;
  co2_saved_pct: number;
  extra_minutes: number;
};

export type Badge = { slug: string; name: string; description: string; unlocked: boolean };

export type DriverSummary = {
  driver: { id: number; name: string; vehicle: string | null };
  today: {
    date: string;
    emitted_kg: number;
    avoided_kg: number;
    reduction_pct: number;
    routes: number;
    empty_trips: number;
  };
  daily_emitted: { date: string; emitted_kg: number }[];
  alternative_routes_chosen: number;
  badges: Badge[];
};

export type RankingRow = { position: number; driver_id: number; name: string; change_pct: number };
export type FleetAlert = { vehicle: string; deviation_pct: number; message: string };

export type ManagerSummary = {
  period: { start: string; end: string; days: number };
  emitted_kg: number;
  avoided_kg: number;
  goal_pct: number | null;
  weekly_emitted: { label: string; start: string; end: string; emitted_kg: number }[];
  ranking: RankingRow[];
  alerts: FleetAlert[];
};

export type VehicleStatus = {
  vehicle: string;
  driver: string | null;
  deviation_pct: number | null;
  alert: boolean;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`A API respondeu ${res.status} em ${path}`);
  return res.json() as Promise<T>;
}

export const getRoutes = () => get<RouteData[]>("/routes");
export const getDriverSummary = (id = DRIVER_ID) => get<DriverSummary>(`/drivers/${id}/summary`);
export const getManagerSummary = () => get<ManagerSummary>("/manager/summary");
export const getFleet = () => get<VehicleStatus[]>("/manager/fleet");
