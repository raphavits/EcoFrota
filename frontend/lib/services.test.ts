import { beforeAll, describe, expect, it } from "vitest";
import { getStore, resetStoreForTests } from "./db";
import { driverSummary, fleetStatus, managerSummary, registerTrip } from "./services";

beforeAll(() => {
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  resetStoreForTests();
});

describe("painéis com dados de demonstração (modo memória)", () => {
  it("gestor: totais, meta, ranking e alerta do protótipo", async () => {
    const m = await managerSummary();
    expect([m.emittedKg, m.avoidedKg, m.goalPct]).toEqual([3240, 980, 72]);
    expect(m.ranking.slice(0, 3).map((r) => r.name)).toEqual(["Ana Souza", "Carlos Lima", "João Pires"]);
    expect(m.ranking.slice(0, 3).map((r) => r.changePct)).toEqual([-24, -18, -11]);
    expect(m.weeklyEmitted).toHaveLength(6);
    expect(m.alerts.map((a) => a.vehicle)).toEqual(["VUC-07"]);
    expect(m.alerts[0].deviationPct).toBe(22);
  });

  it("frota: desvio por veículo", async () => {
    const f = await fleetStatus();
    expect(f.find((v) => v.vehicle === "TQ-11")?.deviationPct).toBe(-24);
    expect(f.filter((v) => v.alert).map((v) => v.vehicle)).toEqual(["VUC-07"]);
  });

  it("motorista: hoje igual ao protótipo", async () => {
    const s = await driverSummary("carlos");
    expect(s?.today).toMatchObject({ emittedKg: 42, avoidedKg: 9, reductionPct: 18, routes: 3 });
    expect(s?.badges.filter((b) => b.unlocked).map((b) => b.id)).toEqual(["piloto-eco"]);
  });

  it("registrar a rota alternativa soma o CO₂ evitado e concede o selo Rota Verde", async () => {
    const before = await driverSummary("carlos");
    const { trip, newBadges } = await registerTrip("carlos", "centro-sul", "alternative");
    expect(trip.co2AvoidedKg).toBeCloseTo(2.3, 1);
    expect(newBadges.map((b) => b.id)).toEqual(["rota-verde"]); // Carlos já tem mais de 10 viagens alternativas
    const after = await driverSummary("carlos");
    expect(after?.today.routes).toBe((before?.today.routes ?? 0) + 1);
  });

  it("manter a rota atual não evita CO₂", async () => {
    const { trip } = await registerTrip("ana", "centro-sul", "current");
    expect(trip.co2AvoidedKg).toBe(0);
  });

  it("recusa motorista ou rota inexistente", async () => {
    await expect(registerTrip("ninguem", "centro-sul", "current")).rejects.toThrow(/Motorista/);
    await expect(registerTrip("ana", "nenhuma", "current")).rejects.toThrow(/Rota/);
  });

  it("CRUD na store: cria, atualiza e remove", async () => {
    const store = await getStore();
    const id = await store.create("vehicles", { code: "TQ-99", expectedKgPerKm: 0.25 });
    await store.update("vehicles", id, { code: "TQ-98" });
    expect((await store.get<{ code: string }>("vehicles", id))?.code).toBe("TQ-98");
    await store.remove("vehicles", id);
    expect(await store.get("vehicles", id)).toBeNull();
  });
});

describe("relatórios em PDF", () => {
  it("gera o PDF da frota e do motorista", async () => {
    const { buildDriverReport, buildFleetReport } = await import("./pdf");
    const { driverTrips, driverSummary: summary } = await import("./services");
    const m = await managerSummary();
    const fleet = await buildFleetReport(m);
    expect(Buffer.from(fleet.slice(0, 5)).toString()).toBe("%PDF-");
    expect(fleet.length).toBeGreaterThan(2000);

    const s = await summary("carlos");
    const trips = await driverTrips("carlos", 30);
    const pdf = await buildDriverReport({
      name: "Carlos Lima — teste ₂ → ★",
      vehicle: "VUC-03",
      today: s!.today,
      badges: s!.badges,
      alternativeRoutesChosen: s!.alternativeRoutesChosen,
      trips: trips.map((t) => ({ date: t.date, route: "Centro → Zona Sul", choice: t.choice, distanceKm: t.distanceKm, durationMin: t.durationMin, co2Kg: t.co2Kg, co2AvoidedKg: t.co2AvoidedKg })),
      days: 30,
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
