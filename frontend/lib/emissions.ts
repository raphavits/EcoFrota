// Cálculo de distância, tempo e CO₂ a partir dos trechos (ruas fictícias) de uma rota.
// Não usa nenhuma API de mapas: os trechos são cadastrados pelo gestor.
import type { RouteMetrics, Segment, Traffic } from "./types";

/** kg de CO₂ por km de um caminhão-tanque a velocidade econômica (referência). */
export const BASE_KG_PER_KM = 0.19;
/** kg de CO₂ por parada e arranque (semáforo, cruzamento, lombada). */
export const KG_PER_STOP = 0.05;
/** Minutos perdidos em cada parada e arranque. */
export const MIN_PER_STOP = 0.4;

export const TRAFFIC_SPEED_FACTOR: Record<Traffic, number> = { livre: 1, moderado: 0.8, intenso: 0.5 };

/** Velocidade média real no trecho (km/h). */
export const effectiveSpeed = (s: Segment) => s.speedKmh * TRAFFIC_SPEED_FACTOR[s.traffic];

/** Multiplicador de consumo: lento e para-e-siga gastam mais; faixa de 55–75 km/h é a mais econômica. */
function consumptionFactor(v: number): number {
  if (v < 30) return 1.6;
  if (v < 45) return 1.3;
  if (v < 55) return 1.05;
  if (v <= 75) return 0.9;
  if (v <= 85) return 1.0;
  return 1.2;
}

export function segmentMetrics(s: Segment) {
  const v = effectiveSpeed(s);
  return {
    minutes: (s.km / v) * 60 + s.stops * MIN_PER_STOP,
    co2: s.km * BASE_KG_PER_KM * consumptionFactor(v) + s.stops * KG_PER_STOP,
  };
}

export function routeMetrics(segments: Segment[]): RouteMetrics {
  let km = 0;
  let minutes = 0;
  let co2 = 0;
  for (const s of segments) {
    const m = segmentMetrics(s);
    km += s.km;
    minutes += m.minutes;
    co2 += m.co2;
  }
  return {
    distanceKm: Math.round(km * 10) / 10,
    durationMin: Math.round(minutes),
    co2Kg: Math.round(co2 * 1000) / 1000, // arredonda só na exibição, para não acumular erro
  };
}

export type RouteComparison = {
  current: RouteMetrics;
  alternative: RouteMetrics;
  co2SavedKg: number;
  co2SavedPct: number;
  extraMinutes: number;
  extraKm: number;
};

export function compareRoutes(current: Segment[], alternative: Segment[]): RouteComparison {
  const c = routeMetrics(current);
  const a = routeMetrics(alternative);
  return {
    current: c,
    alternative: a,
    co2SavedKg: Math.round((c.co2Kg - a.co2Kg) * 1000) / 1000,
    co2SavedPct: c.co2Kg > 0 ? Math.round(((c.co2Kg - a.co2Kg) / c.co2Kg) * 100) : 0,
    extraMinutes: a.durationMin - c.durationMin,
    extraKm: Math.round((a.distanceKm - c.distanceKm) * 10) / 10,
  };
}

/** Valida os trechos digitados no cadastro. Devolve a mensagem de erro ou null. */
export function validateSegments(segments: Segment[], label: string): string | null {
  if (segments.length === 0) return `${label}: adicione ao menos um trecho.`;
  for (const [i, s] of segments.entries()) {
    const n = `${label}, trecho ${i + 1}`;
    if (!s.street.trim()) return `${n}: informe o nome da rua.`;
    if (!(s.km > 0 && s.km <= 500)) return `${n}: distância deve ser maior que 0 e até 500 km.`;
    if (!(s.speedKmh >= 10 && s.speedKmh <= 120)) return `${n}: velocidade deve ficar entre 10 e 120 km/h.`;
    if (!(s.traffic in TRAFFIC_SPEED_FACTOR)) return `${n}: trânsito inválido.`;
    if (!(Number.isInteger(s.stops) && s.stops >= 0 && s.stops <= 100)) return `${n}: paradas deve ser um inteiro de 0 a 100.`;
  }
  return null;
}
