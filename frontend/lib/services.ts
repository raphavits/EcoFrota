// Regras de negócio do EcoFrota: viagens, painéis, ranking, alertas e selos.
import { addDays, todayBR } from "./dates";
import { getStore, type Doc } from "./db";
import { compareRoutes, type RouteComparison } from "./emissions";
import { BADGES, type Choice, type Driver, type Route, type Trip, type Vehicle } from "./types";

/** Veículo acima disso do padrão de emissão gera alerta de manutenção. */
export const ALERT_THRESHOLD_PCT = 15;
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const sum = (rows: Trip[], f: (t: Trip) => number) => rows.reduce((s, t) => s + f(t), 0);

// ---------- cadastros ----------

export async function listVehicles() {
  return (await (await getStore()).list<Vehicle>("vehicles")).sort((a, b) => a.code.localeCompare(b.code));
}
export async function listDrivers() {
  return (await (await getStore()).list<Driver>("drivers")).sort((a, b) => a.name.localeCompare(b.name));
}
export async function listRoutes() {
  return (await (await getStore()).list<Route>("routes")).sort((a, b) => a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination));
}
export async function getRoute(id: string) {
  return (await getStore()).get<Route>("routes", id);
}

export type RouteView = Doc<Route> & { label: string; comparison: RouteComparison };
export const routeView = (r: Doc<Route>): RouteView => ({
  ...r,
  label: `${r.origin} → ${r.destination}`,
  comparison: compareRoutes(r.current, r.alternative),
});

// ---------- viagens ----------

export async function registerTrip(driverId: string, routeId: string, choice: Choice) {
  const store = await getStore();
  const [driver, route] = await Promise.all([store.get<Driver>("drivers", driverId), store.get<Route>("routes", routeId)]);
  if (!driver) throw new Error("Motorista não encontrado.");
  if (!route) throw new Error("Rota não encontrada.");
  const c = compareRoutes(route.current, route.alternative);
  const chosen = choice === "alternative" ? c.alternative : c.current;
  const trip: Omit<Trip, "id"> = {
    driverId,
    routeId,
    choice,
    date: todayBR(),
    distanceKm: chosen.distanceKm,
    durationMin: chosen.durationMin,
    co2Kg: chosen.co2Kg,
    co2AvoidedKg: choice === "alternative" ? c.co2SavedKg : 0,
    emptyReturn: false,
  };
  const id = await store.create("trips", trip);
  const newBadges = await awardBadges(driver);
  return { trip: { ...trip, id }, newBadges };
}

export async function awardBadges(driver: Doc<Driver>) {
  const store = await getStore();
  const trips = await store.list<Trip>("trips", { where: [["driverId", "==", driver.id]] });
  const rules: Record<string, boolean> = {
    "piloto-eco": driver.daysWithoutHardBraking >= 7,
    "rota-verde": trips.filter((t) => t.choice === "alternative").length >= 10,
  };
  const earned = BADGES.filter((b) => rules[b.id] && !driver.badges.includes(b.id));
  if (earned.length) await store.update("drivers", driver.id, { badges: [...driver.badges, ...earned.map((b) => b.id)] });
  return earned;
}

// ---------- motorista ----------

export async function driverSummary(driverId: string) {
  const store = await getStore();
  const driver = await store.get<Driver>("drivers", driverId);
  if (!driver) return null;
  const today = todayBR();
  const since = addDays(today, -5);
  const [recent, mine, vehicle] = await Promise.all([
    store.list<Trip>("trips", { where: [["date", ">=", since]] }),
    store.list<Trip>("trips", { where: [["driverId", "==", driverId]] }),
    driver.vehicleId ? store.get<Vehicle>("vehicles", driver.vehicleId) : Promise.resolve(null),
  ]);
  const mineRecent = recent.filter((t) => t.driverId === driverId);
  const day = mineRecent.filter((t) => t.date === today);
  const emitted = sum(day, (t) => t.co2Kg);
  const avoided = sum(day, (t) => t.co2AvoidedKg);
  const total = emitted + avoided;

  return {
    driver: { id: driver.id, name: driver.name, vehicle: vehicle?.code ?? null },
    today: {
      date: today,
      emittedKg: round(emitted),
      avoidedKg: round(avoided),
      reductionPct: total ? Math.round((avoided / total) * 100) : 0,
      routes: day.length,
      emptyTrips: day.filter((t) => t.emptyReturn).length,
    },
    dailyEmitted: Array.from({ length: 6 }, (_, i) => {
      const date = addDays(today, i - 5);
      return { date, emittedKg: round(sum(mineRecent.filter((t) => t.date === date), (t) => t.co2Kg)) };
    }),
    alternativeRoutesChosen: mine.filter((t) => t.choice === "alternative").length,
    badges: BADGES.map((b) => ({ ...b, unlocked: driver.badges.includes(b.id) })),
  };
}

// ---------- gestor ----------

export async function managerSummary() {
  const store = await getStore();
  const today = todayBR();
  const start60 = addDays(today, -59);
  const [trips, drivers, vehicles, goalDoc] = await Promise.all([
    store.list<Trip>("trips", { where: [["date", ">=", start60]] }),
    listDrivers(),
    listVehicles(),
    store.get<{ targetAvoidedKg: number }>("settings", "goal"),
  ]);

  const start30 = addDays(today, -29);
  const cur = trips.filter((t) => t.date >= start30);
  const prev = trips.filter((t) => t.date < start30);
  const emitted = sum(cur, (t) => t.co2Kg);
  const avoided = sum(cur, (t) => t.co2AvoidedKg);

  const weekly = Array.from({ length: 6 }, (_, k) => {
    const i = 5 - k; // 0 = semana mais recente
    const end = addDays(today, -7 * i);
    const start = addDays(end, -6);
    return {
      label: `S${k + 1}`,
      start,
      end,
      emittedKg: Math.round(sum(trips.filter((t) => t.date >= start && t.date <= end), (t) => t.co2Kg)),
    };
  });

  const ranking = drivers
    .map((d) => {
      const c = sum(cur.filter((t) => t.driverId === d.id), (t) => t.co2Kg);
      const p = sum(prev.filter((t) => t.driverId === d.id), (t) => t.co2Kg);
      return p ? { driverId: d.id, name: d.name, changePct: Math.round((c / p - 1) * 100) } : null;
    })
    .filter((r): r is { driverId: string; name: string; changePct: number } => r !== null)
    .sort((a, b) => a.changePct - b.changePct)
    .map((r, i) => ({ ...r, position: i + 1 }));

  const fleet = fleetStatusFrom(trips, drivers, vehicles, today);
  const goal = goalDoc?.targetAvoidedKg;
  return {
    period: { start: start30, end: today, days: 30 },
    emittedKg: Math.round(emitted),
    avoidedKg: Math.round(avoided),
    goalPct: goal ? Math.min(Math.round((avoided / goal) * 100), 999) : null,
    weeklyEmitted: weekly,
    ranking,
    fleet,
    alerts: fleet
      .filter((v) => v.alert)
      .map((v) => ({ vehicle: v.vehicle, deviationPct: v.deviationPct as number, message: `Veículo ${v.vehicle} está ${v.deviationPct}% acima do padrão de emissão esperado.` })),
  };
}

export type FleetRow = { id: string; vehicle: string; driver: string | null; deviationPct: number | null; alert: boolean };

/** Emissão por km dos últimos 14 dias contra o padrão esperado de cada veículo. */
function fleetStatusFrom(trips: Trip[], drivers: Doc<Driver>[], vehicles: Doc<Vehicle>[], today: string): FleetRow[] {
  const start = addDays(today, -13);
  return vehicles.map((v) => {
    const driver = drivers.find((d) => d.vehicleId === v.id) ?? null;
    const mine = driver ? trips.filter((t) => t.driverId === driver.id && t.date >= start) : [];
    const km = sum(mine, (t) => t.distanceKm);
    const deviation = km && v.expectedKgPerKm ? Math.round((sum(mine, (t) => t.co2Kg) / km / v.expectedKgPerKm - 1) * 100) : null;
    return { id: v.id, vehicle: v.code, driver: driver?.name ?? null, deviationPct: deviation, alert: deviation !== null && deviation > ALERT_THRESHOLD_PCT };
  });
}

export async function fleetStatus() {
  return (await managerSummary()).fleet;
}

/** Viagens recentes de um motorista, para o relatório individual. */
export async function driverTrips(driverId: string, days = 30) {
  const store = await getStore();
  const since = addDays(todayBR(), -(days - 1));
  const rows = await store.list<Trip>("trips", { where: [["driverId", "==", driverId]] });
  return rows.filter((t) => t.date >= since).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
