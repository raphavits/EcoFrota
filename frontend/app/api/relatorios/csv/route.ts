import { managerSummary } from "@/lib/services";

export const dynamic = "force-dynamic";

/** Relatório ESG em CSV (separador ";", abre direto no Excel em pt-BR). */
export async function GET() {
  const m = await managerSummary();
  const rows: (string | number)[][] = [
    ["periodo_inicio", "periodo_fim", "co2_emitido_kg", "co2_evitado_kg", "meta_atingida_pct"],
    [m.period.start, m.period.end, m.emittedKg, m.avoidedKg, m.goalPct ?? ""],
    [],
    ["posicao", "motorista", "variacao_co2_pct"],
    ...m.ranking.map((r) => [r.position, r.name, r.changePct]),
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ecofrota-esg.csv"',
      "Cache-Control": "no-store",
    },
  });
}
