"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { validateSegments } from "@/lib/emissions";
import { awardBadges, listDrivers, listRoutes, listVehicles, registerTrip } from "@/lib/services";
import type { Choice, Driver, Route, Segment, Vehicle } from "@/lib/types";

export type FormState = { error?: string };

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "").replace(",", "."));

function refresh() {
  revalidatePath("/gestor", "layout");
  revalidatePath("/motorista", "layout");
}

// ---------- viagem (motorista) ----------

export async function registerTripAction(driverId: string, routeId: string, choice: Choice) {
  if (choice !== "alternative" && choice !== "current") return { error: "Escolha inválida." };
  try {
    const { trip, newBadges } = await registerTrip(driverId, routeId, choice);
    refresh();
    return { co2AvoidedKg: trip.co2AvoidedKg, newBadges: newBadges.map((b) => b.name) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a rota." };
  }
}

// ---------- veículos ----------

function parseVehicle(f: FormData) {
  const code = text(f, "code").toUpperCase();
  const expectedKgPerKm = num(f, "expectedKgPerKm");
  if (code.length < 2 || code.length > 20) return { error: "O código do veículo deve ter de 2 a 20 caracteres." } as const;
  if (!(expectedKgPerKm >= 0.05 && expectedKgPerKm <= 1)) return { error: "A emissão esperada deve ficar entre 0,05 e 1 kg de CO₂ por km." } as const;
  return { code, expectedKgPerKm } as const;
}

export async function saveVehicle(_: FormState, f: FormData): Promise<FormState> {
  const id = text(f, "id");
  const v = parseVehicle(f);
  if ("error" in v) return v;
  const others = (await listVehicles()).filter((x) => x.id !== id);
  if (others.some((x) => x.code === v.code)) return { error: `Já existe um veículo ${v.code}.` };
  const store = await getStore();
  if (id) await store.update("vehicles", id, v);
  else await store.create("vehicles", { ...v } satisfies Omit<Vehicle, "id">);
  refresh();
  redirect("/gestor/frota");
}

export async function deleteVehicle(f: FormData) {
  const id = text(f, "id");
  const store = await getStore();
  for (const d of (await listDrivers()).filter((d) => d.vehicleId === id)) await store.update("drivers", d.id, { vehicleId: null });
  await store.remove("vehicles", id);
  refresh();
}

// ---------- motoristas ----------

export async function saveDriver(_: FormState, f: FormData): Promise<FormState> {
  const id = text(f, "id");
  const name = text(f, "name");
  const vehicleId = text(f, "vehicleId") || null;
  const days = num(f, "daysWithoutHardBraking");
  if (name.length < 2 || name.length > 80) return { error: "O nome deve ter de 2 a 80 caracteres." };
  if (!Number.isInteger(days) || days < 0 || days > 3650) return { error: "Dias sem frenagem brusca deve ser um inteiro de 0 a 3650." };
  const [vehicles, drivers] = await Promise.all([listVehicles(), listDrivers()]);
  if (vehicleId && !vehicles.some((v) => v.id === vehicleId)) return { error: "Veículo inexistente." };
  const taken = vehicleId ? drivers.find((d) => d.vehicleId === vehicleId && d.id !== id) : null;
  if (taken) return { error: `Esse veículo já está com ${taken.name}.` };

  const store = await getStore();
  if (id) {
    await store.update("drivers", id, { name, vehicleId, daysWithoutHardBraking: days });
    const d = await store.get<Driver>("drivers", id);
    if (d) await awardBadges(d);
  } else {
    await store.create("drivers", { name, vehicleId, daysWithoutHardBraking: days, badges: [] } satisfies Omit<Driver, "id">);
  }
  refresh();
  redirect("/gestor/motoristas");
}

export async function deleteDriver(f: FormData) {
  await (await getStore()).remove("drivers", text(f, "id"));
  refresh();
}

// ---------- rotas (trechos em ruas fictícias) ----------

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function parseSegments(raw: string): Segment[] | null {
  try {
    const arr = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(arr)) return null;
    return arr.map((s) => ({
      street: String(s.street ?? "").trim(),
      km: Number(s.km),
      speedKmh: Number(s.speedKmh),
      traffic: String(s.traffic) as Segment["traffic"],
      stops: Number(s.stops),
    }));
  } catch {
    return null;
  }
}

export async function saveRoute(_: FormState, f: FormData): Promise<FormState> {
  const id = text(f, "id");
  const origin = text(f, "origin");
  const destination = text(f, "destination");
  if (origin.length < 2 || destination.length < 2) return { error: "Informe origem e destino (mínimo 2 caracteres)." };
  if (origin.toLowerCase() === destination.toLowerCase()) return { error: "Origem e destino devem ser diferentes." };
  const current = parseSegments(text(f, "current"));
  const alternative = parseSegments(text(f, "alternative"));
  if (!current || !alternative) return { error: "Trechos inválidos." };
  const err = validateSegments(current, "Rota atual") ?? validateSegments(alternative, "Rota alternativa");
  if (err) return { error: err };

  const routes = await listRoutes();
  if (routes.some((r) => r.id !== id && r.origin.toLowerCase() === origin.toLowerCase() && r.destination.toLowerCase() === destination.toLowerCase())) {
    return { error: `Já existe uma rota ${origin} → ${destination}.` };
  }
  const data: Omit<Route, "id"> = { origin, destination, current, alternative };
  const store = await getStore();
  if (id) await store.update("routes", id, data);
  else {
    let newId = slug(`${origin}-${destination}`) || "rota";
    while (routes.some((r) => r.id === newId)) newId += "-2";
    await store.create("routes", data, newId);
  }
  refresh();
  redirect("/gestor/rotas");
}

export async function deleteRoute(f: FormData) {
  await (await getStore()).remove("routes", text(f, "id"));
  refresh();
}
