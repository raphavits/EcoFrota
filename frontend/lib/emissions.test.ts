import { describe, expect, it } from "vitest";
import { compareRoutes, routeMetrics, validateSegments } from "./emissions";
import { DEMO_ROUTES } from "./seed";

const route = (id: string) => {
  const r = DEMO_ROUTES.find((x) => x.id === id);
  if (!r) throw new Error(id);
  return r;
};

describe("cálculo por trechos (ruas fictícias)", () => {
  it("reproduz o exemplo do protótipo (Centro → Zona Sul)", () => {
    const c = compareRoutes(route("centro-sul").current, route("centro-sul").alternative);
    expect(c.current.distanceKm).toBe(32);
    expect(c.current.durationMin).toBe(24);
    expect(c.current.co2Kg.toFixed(1)).toBe("7.4");
    expect(c.alternative.distanceKm).toBe(29);
    expect(c.alternative.durationMin).toBe(27);
    expect(c.alternative.co2Kg.toFixed(1)).toBe("5.1");
    expect(c.co2SavedPct).toBe(31);
    expect(c.extraMinutes).toBe(3);
  });

  it("todas as rotas de demonstração têm alternativa com menos CO₂", () => {
    for (const r of DEMO_ROUTES) expect(compareRoutes(r.current, r.alternative).co2SavedKg).toBeGreaterThan(0);
  });

  it("trânsito intenso e paradas aumentam tempo e CO₂", () => {
    const base = { street: "Rua X", km: 10, speedKmh: 60 };
    const free = routeMetrics([{ ...base, traffic: "livre", stops: 0 }]);
    const heavy = routeMetrics([{ ...base, traffic: "intenso", stops: 6 }]);
    expect(heavy.durationMin).toBeGreaterThan(free.durationMin);
    expect(heavy.co2Kg).toBeGreaterThan(free.co2Kg);
  });

  it("valida trechos inválidos", () => {
    expect(validateSegments([], "Rota atual")).toMatch(/ao menos um trecho/);
    expect(validateSegments([{ street: "", km: 1, speedKmh: 50, traffic: "livre", stops: 0 }], "Rota atual")).toMatch(/nome da rua/);
    expect(validateSegments([{ street: "A", km: -2, speedKmh: 50, traffic: "livre", stops: 0 }], "Rota atual")).toMatch(/distância/);
    expect(validateSegments([{ street: "A", km: 2, speedKmh: 50, traffic: "livre", stops: 1.5 }], "Rota atual")).toMatch(/paradas/);
    expect(validateSegments([{ street: "A", km: 2, speedKmh: 50, traffic: "livre", stops: 1 }], "Rota atual")).toBeNull();
  });
});
