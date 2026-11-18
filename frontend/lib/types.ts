export type Traffic = "livre" | "moderado" | "intenso";

/** Um trecho de uma rua (fictícia) dentro de uma rota. */
export type Segment = {
  street: string;
  km: number;
  speedKmh: number; // velocidade da via com trânsito livre
  traffic: Traffic;
  stops: number; // semáforos, cruzamentos e lombadas (paradas e arranques)
};

export type Route = {
  id: string;
  origin: string;
  destination: string;
  current: Segment[];
  alternative: Segment[];
};

export type Vehicle = { id: string; code: string; expectedKgPerKm: number };

export type Driver = {
  id: string;
  name: string;
  vehicleId: string | null;
  daysWithoutHardBraking: number;
  badges: string[]; // ids de BADGES
};

export type Choice = "alternative" | "current";

export type Trip = {
  id: string;
  driverId: string;
  routeId: string | null;
  choice: Choice;
  date: string; // AAAA-MM-DD (America/Sao_Paulo)
  distanceKm: number;
  durationMin: number;
  co2Kg: number;
  co2AvoidedKg: number;
  emptyReturn: boolean;
};

export type RouteMetrics = { distanceKm: number; durationMin: number; co2Kg: number };

export const BADGES = [
  { id: "piloto-eco", name: "Piloto Eco", description: "7 dias seguidos sem frenagem brusca" },
  { id: "rota-verde", name: "Rota Verde", description: "10 rotas alternativas escolhidas" },
  { id: "meta-do-mes", name: "Meta do mês", description: "Atingir 100% da meta mensal de CO₂" },
] as const;
