// Dados SINTÉTICOS de demonstração: 60 dias de viagens calibrados para reproduzir os números do protótipo
// (3.240 kg emitidos, 980 kg evitados, meta de 72%, ranking, alerta do VUC-07).
import { addDays, todayBR } from "./dates";
import { COLLECTIONS, type Store } from "./db";
import type { Driver, Route, Segment, Trip, Vehicle } from "./types";

const seg = (street: string, km: number, speedKmh: number, traffic: Segment["traffic"], stops: number): Segment => ({
  street, km, speedKmh, traffic, stops,
});

// Ruas fictícias. Os trechos foram ajustados para o cálculo (lib/emissions.ts) dar os valores do protótipo:
// Centro → Zona Sul: atual 32 km · 24 min · 7,4 kg  |  alternativa 29 km · 27 min · 5,1 kg.
export const DEMO_ROUTES: Route[] = [
  {
    id: "centro-sul",
    origin: "Centro",
    destination: "Zona Sul",
    current: [
      seg("Rua das Acácias", 3.5, 40, "livre", 1),
      seg("Via Expressa Sul", 15, 100, "livre", 2),
      seg("Viaduto do Contorno", 3, 100, "moderado", 1),
      seg("Marginal Leste", 10.5, 100, "livre", 0),
    ],
    alternative: [
      seg("Avenida dos Ipês", 9, 70, "livre", 0),
      seg("Avenida Beira-Rio", 7, 80, "moderado", 1),
      seg("Rua do Comércio", 8, 90, "moderado", 0),
      seg("Alameda dos Cedros", 5, 80, "moderado", 2),
    ],
  },
  {
    id: "centro-norte",
    origin: "Centro",
    destination: "Zona Norte",
    current: [
      seg("Avenida Industrial", 6.5, 90, "livre", 4),
      seg("Marginal Oeste", 25, 90, "livre", 5),
      seg("Rua do Mercado", 3, 90, "moderado", 2),
      seg("Avenida Norte", 6.5, 70, "moderado", 8),
    ],
    alternative: [
      seg("Rua Quinze", 6, 60, "moderado", 4),
      seg("Travessa São João", 2, 70, "livre", 3),
      seg("Rodovia Municipal", 23.5, 90, "moderado", 8),
      seg("Avenida das Flores", 6.5, 90, "moderado", 3),
    ],
  },
  {
    id: "porto-distribuidora",
    origin: "Porto",
    destination: "Distribuidora",
    current: [
      seg("Rua do Porto", 2, 80, "intenso", 8),
      seg("Avenida Industrial", 2, 90, "livre", 8),
      seg("Rodovia do Porto", 9.5, 90, "livre", 6),
      seg("Avenida das Docas", 4.5, 90, "livre", 0),
    ],
    alternative: [
      seg("Avenida das Docas", 5, 80, "livre", 7),
      seg("Rua dos Estaleiros", 2, 50, "livre", 7),
      seg("Rua do Armazém", 5, 70, "livre", 8),
      seg("Avenida Industrial", 5, 90, "moderado", 2),
    ],
  },
];

// id, nome, veículo, desvio de emissão por km vs esperado (%), variação de CO₂ vs 30 dias anteriores (%), dias sem frenagem brusca
const DRIVERS = [
  ["carlos", "Carlos Lima", "VUC-03", -18, -18, 7],
  ["ana", "Ana Souza", "TQ-11", -24, -24, 12],
  ["joao", "João Pires", "TQ-14", -11, -11, 4],
  ["marta", "Marta Reis", "TQ-08", -7, -7, 2],
  ["paulo", "Paulo Nunes", "TQ-02", 4, -3, 1],
  ["rafael", "Rafael Dias", "VUC-07", 22, 6, 0],
] as const;

const TARGET_EMITTED = 3240;
const TARGET_AVOIDED = 980;
const GOAL_PCT = 72;
const P_ALTERNATIVE = 0.7;
const EXPECTED_KG_PER_KM = 0.231;
const CARLOS_TODAY = { co2: 14, avoided: 3, trips: 3 }; // 42 kg emitidos e 9 kg evitados hoje

/** Gerador pseudoaleatório determinístico: os dados de exemplo são sempre os mesmos. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Raw = { d: number; routeId: string; km: number; mn: number; co2: number; alt: boolean };
const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildDemoData(today: string = todayBR()) {
  const rnd = mulberry32(42);
  const uniform = (a: number, b: number) => a + (b - a) * rnd();

  const vehicles: Vehicle[] = DRIVERS.map(([, , code]) => ({
    id: code.toLowerCase(),
    code,
    expectedKgPerKm: EXPECTED_KG_PER_KM,
  }));
  const drivers: Driver[] = DRIVERS.map(([id, name, code, , , braking]) => ({
    id,
    name,
    vehicleId: code.toLowerCase(),
    daysWithoutHardBraking: braking,
    badges: braking >= 7 ? ["piloto-eco"] : [],
  }));

  const perDriver = DRIVERS.map(([id, , , dev, change]) => {
    const raw: Raw[] = [];
    for (let d = 0; d < 60; d++) {
      if (id === "carlos" && d === 0) continue; // o dia de hoje do Carlos é fixo
      const route = DEMO_ROUTES[Math.floor(rnd() * DEMO_ROUTES.length)];
      const km = 30 * uniform(0.92, 1.08);
      raw.push({
        d,
        routeId: route.id,
        km,
        mn: (28 * km) / 30,
        co2: km * EXPECTED_KG_PER_KM * (1 + dev / 100) * uniform(0.995, 1.005),
        alt: rnd() < P_ALTERNATIVE,
      });
    }
    return { id, raw, change };
  });

  // Tendência contínua por motorista, exp(g·dias), que impõe a variação vs 30 dias anteriores,
  // e escala que fecha o total de 30 dias em TARGET_EMITTED.
  const todayTotal = CARLOS_TODAY.co2 * CARLOS_TODAY.trips;
  const share = (TARGET_EMITTED - todayTotal) / perDriver.length;
  for (const { id, raw, change } of perDriver) {
    const extra = id === "carlos" ? todayTotal : 0;
    const want = (share + extra) / ((1 + change / 100) * share); // soma anterior / soma atual
    const parts = (g: number) => {
      let cur = 0;
      let prev = 0;
      for (const t of raw) {
        const w = t.co2 * Math.exp(g * (t.d - 15));
        if (t.d < 30) cur += w;
        else prev += w;
      }
      return [cur, prev] as const;
    };
    let lo = -0.1;
    let hi = 0.1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const [cur, prev] = parts(mid);
      if (prev / cur < want) lo = mid;
      else hi = mid;
    }
    const g = (lo + hi) / 2;
    const c = share / parts(g)[0];
    for (const t of raw) {
      const f = c * Math.exp(g * (t.d - 15));
      t.km *= f;
      t.mn *= f;
      t.co2 *= f;
    }
  }

  // CO₂ evitado: só as viagens pela rota alternativa evitam; a escala fecha o total de 30 dias.
  const avoidedRest = TARGET_AVOIDED - CARLOS_TODAY.avoided * CARLOS_TODAY.trips;
  const altWindow = perDriver.flatMap((p) => p.raw).filter((t) => t.d < 30 && t.alt).reduce((s, t) => s + t.co2, 0);
  const kWindow = avoidedRest / altWindow;
  const kPrev = 0.2;

  const trips: Trip[] = [];
  let n = 0;
  for (const { id, raw } of perDriver) {
    for (const t of raw) {
      const k = t.alt ? (t.d < 30 ? kWindow : kPrev) : 0;
      trips.push({
        id: `t${String(++n).padStart(4, "0")}`,
        driverId: id,
        routeId: t.routeId,
        choice: t.alt ? "alternative" : "current",
        date: addDays(today, -t.d),
        distanceKm: Math.round(t.km * 10) / 10,
        durationMin: Math.max(1, Math.round(t.mn)),
        co2Kg: r2(t.co2),
        co2AvoidedKg: r2(t.co2 * k),
        emptyReturn: false,
      });
    }
  }
  for (let i = 0; i < CARLOS_TODAY.trips; i++) {
    trips.push({
      id: `t${String(++n).padStart(4, "0")}`,
      driverId: "carlos",
      routeId: "centro-sul",
      choice: "alternative",
      date: today,
      distanceKm: 74,
      durationMin: 70,
      co2Kg: CARLOS_TODAY.co2,
      co2AvoidedKg: CARLOS_TODAY.avoided,
      emptyReturn: false,
    });
  }

  const goal = { id: "goal", targetAvoidedKg: Math.round((TARGET_AVOIDED / (GOAL_PCT / 100)) * 10) / 10 };
  return { vehicles, drivers, routes: DEMO_ROUTES, trips, settings: [goal] };
}

/** Apaga as coleções e grava os dados de demonstração. */
export async function seedStore(store: Store, today?: string) {
  const data = buildDemoData(today);
  for (const col of COLLECTIONS) await store.clear(col);
  for (const col of COLLECTIONS) {
    const docs = data[col].map(({ id, ...rest }) => ({ id, data: rest }));
    await store.setMany(col, docs);
  }
}
