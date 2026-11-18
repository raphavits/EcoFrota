// Geração de relatórios em PDF (pdf-lib: JavaScript puro, funciona na Vercel sem arquivos de fonte).
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const GREEN = rgb(0.176, 0.29, 0.212);
const ORANGE = rgb(0.71, 0.322, 0.122);
const INK = rgb(0.11, 0.165, 0.129);
const MUTED = rgb(0.365, 0.42, 0.38);
const TINT = rgb(0.89, 0.922, 0.878);
const LINE = rgb(0.875, 0.863, 0.804);
const W = 595.28;
const H = 841.89;
const M = 40;

/** As fontes padrão do PDF só têm Latin-1: troca símbolos fora dele (₂, −, →, ★) por equivalentes. */
export const clean = (s: string) =>
  s.replace(/₂/g, "2").replace(/[−–—]/g, "-").replace(/→/g, "->").replace(/[^\x20-\x7e\xa0-\xff]/g, "");

const nf = (n: number, d = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const dateBR = (iso: string) => iso.split("-").reverse().join("/");

class Report {
  doc!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  page!: PDFPage;
  y = 0;
  private pages = 0;

  static async create(title: string, subtitle: string) {
    const r = new Report();
    r.doc = await PDFDocument.create();
    r.doc.setTitle(clean(title));
    r.doc.setCreator("EcoFrota");
    r.font = await r.doc.embedFont(StandardFonts.Helvetica);
    r.bold = await r.doc.embedFont(StandardFonts.HelveticaBold);
    r.newPage();
    r.page.drawRectangle({ x: 0, y: H - 86, width: W, height: 86, color: GREEN });
    r.text("EcoFrota", M, H - 38, 11, r.bold, TINT);
    r.text(title, M, H - 62, 20, r.bold, rgb(1, 1, 1));
    r.text(subtitle, M, H - 78, 9, r.font, TINT);
    r.y = H - 86 - 26;
    return r;
  }

  private newPage() {
    this.page = this.doc.addPage([W, H]);
    this.pages++;
    this.y = H - M;
  }

  text(s: string, x: number, y: number, size = 10, font = this.font, color = INK) {
    this.page.drawText(clean(s), { x, y, size, font, color });
  }

  ensure(height: number) {
    if (this.y - height < M + 20) this.newPage();
  }

  heading(s: string) {
    this.ensure(40);
    this.text(s.toUpperCase(), M, this.y, 9, this.bold, MUTED);
    this.page.drawLine({ start: { x: M, y: this.y - 5 }, end: { x: W - M, y: this.y - 5 }, thickness: 0.7, color: LINE });
    this.y -= 22;
  }

  kpis(items: { label: string; value: string; color?: ReturnType<typeof rgb> }[]) {
    this.ensure(64);
    const gap = 10;
    const w = (W - 2 * M - gap * (items.length - 1)) / items.length;
    items.forEach((it, i) => {
      const x = M + i * (w + gap);
      this.page.drawRectangle({ x, y: this.y - 50, width: w, height: 50, color: TINT });
      this.text(it.label.toUpperCase(), x + 10, this.y - 16, 7.5, this.font, MUTED);
      this.text(it.value, x + 10, this.y - 38, 17, this.bold, it.color ?? GREEN);
    });
    this.y -= 72;
  }

  bars(values: number[], labels: string[], unit: string) {
    const h = 90;
    this.ensure(h + 36);
    const max = Math.max(...values, 1);
    const gap = 12;
    const w = (W - 2 * M - gap * (values.length - 1)) / values.length;
    values.forEach((v, i) => {
      const bh = Math.max((v / max) * h, 2);
      const x = M + i * (w + gap);
      this.page.drawRectangle({ x, y: this.y - h, width: w, height: bh, color: i === values.length - 1 ? GREEN : rgb(0.29, 0.388, 0.322) });
      const label = `${nf(v)} ${unit}`;
      this.text(label, x + w / 2 - this.font.widthOfTextAtSize(clean(label), 8) / 2, this.y - h + bh + 4, 8);
      const l = clean(labels[i]);
      this.text(l, x + w / 2 - this.font.widthOfTextAtSize(l, 8) / 2, this.y - h - 12, 8, this.font, MUTED);
    });
    this.y -= h + 34;
  }

  table(head: string[], rows: string[][], widths: number[], opts: { warnRows?: Set<number> } = {}) {
    const rowH = 20;
    const drawHead = () => {
      this.page.drawRectangle({ x: M, y: this.y - 14, width: W - 2 * M, height: 18, color: TINT });
      let x = M + 6;
      head.forEach((h, i) => {
        this.text(h.toUpperCase(), x, this.y - 8, 7.5, this.bold, MUTED);
        x += widths[i];
      });
      this.y -= 22;
    };
    this.ensure(rowH * 3);
    drawHead();
    rows.forEach((row, ri) => {
      if (this.y - rowH < M + 20) {
        this.newPage();
        drawHead();
      }
      let x = M + 6;
      row.forEach((cell, i) => {
        this.text(cell, x, this.y - 8, 9.5, ri === -1 ? this.bold : this.font, opts.warnRows?.has(ri) && i === row.length - 1 ? ORANGE : INK);
        x += widths[i];
      });
      this.page.drawLine({ start: { x: M, y: this.y - 14 }, end: { x: W - M, y: this.y - 14 }, thickness: 0.4, color: LINE });
      this.y -= rowH;
    });
    this.y -= 10;
  }

  alert(s: string) {
    this.ensure(30);
    this.page.drawRectangle({ x: M, y: this.y - 20, width: W - 2 * M, height: 24, color: rgb(0.969, 0.902, 0.847) });
    this.text(s, M + 10, this.y - 12, 9.5, this.font, ORANGE);
    this.y -= 34;
  }

  note(s: string) {
    this.ensure(18);
    this.text(s, M, this.y, 8.5, this.font, MUTED);
    this.y -= 14;
  }

  async finish(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    const stamp = clean(`Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
    pages.forEach((p, i) => {
      p.drawText(stamp, { x: M, y: 22, size: 8, font: this.font, color: MUTED });
      const n = `Página ${i + 1} de ${pages.length}`;
      p.drawText(n, { x: W - M - this.font.widthOfTextAtSize(n, 8), y: 22, size: 8, font: this.font, color: MUTED });
    });
    return this.doc.save();
  }
}

export type FleetReportData = {
  period: { start: string; end: string; days: number };
  emittedKg: number;
  avoidedKg: number;
  goalPct: number | null;
  weeklyEmitted: { label: string; emittedKg: number }[];
  ranking: { position: number; name: string; changePct: number }[];
  fleet: { vehicle: string; driver: string | null; deviationPct: number | null; alert: boolean }[];
  alerts: { message: string }[];
};

export async function buildFleetReport(d: FleetReportData) {
  const r = await Report.create("Relatório ESG da frota", `Período: ${dateBR(d.period.start)} a ${dateBR(d.period.end)} (${d.period.days} dias)`);
  const baseline = d.emittedKg + d.avoidedKg;
  r.kpis([
    { label: "CO₂ emitido", value: `${nf(d.emittedKg)} kg`, color: ORANGE },
    { label: "CO₂ evitado", value: `${nf(d.avoidedKg)} kg` },
    { label: "Redução vs referência", value: `${baseline ? Math.round((d.avoidedKg / baseline) * 100) : 0}%` },
    { label: "Meta do mês", value: d.goalPct === null ? "-" : `${d.goalPct}%` },
  ]);
  r.heading("Evolução semanal do CO₂ emitido (últimas 6 semanas)");
  r.bars(d.weeklyEmitted.map((w) => w.emittedKg), d.weeklyEmitted.map((w) => w.label), "kg");
  r.heading("Ranking ambiental (variação do CO₂ vs 30 dias anteriores)");
  r.table(["#", "Motorista", "Variação de CO₂"], d.ranking.map((x) => [String(x.position), x.name, `${x.changePct > 0 ? "+" : ""}${x.changePct}%`]), [40, 280, 150]);
  r.heading("Frota (emissão por km nos últimos 14 dias vs esperado)");
  r.table(
    ["Veículo", "Motorista", "Desvio"],
    d.fleet.map((v) => [v.vehicle, v.driver ?? "-", v.deviationPct === null ? "sem dados" : `${v.deviationPct > 0 ? "+" : ""}${v.deviationPct}%`]),
    [120, 220, 130],
    { warnRows: new Set(d.fleet.flatMap((v, i) => (v.alert ? [i] : []))) },
  );
  if (d.alerts.length) {
    r.heading("Alertas de manutenção");
    d.alerts.forEach((a) => r.alert(`! ${a.message}`));
  }
  r.note("CO₂ evitado = CO₂ da rota atual menos o CO₂ da rota escolhida pelo motorista. Dados calculados pelo EcoFrota.");
  return r.finish();
}

export type DriverReportData = {
  name: string;
  vehicle: string | null;
  today: { emittedKg: number; avoidedKg: number; reductionPct: number; routes: number };
  badges: { name: string; unlocked: boolean }[];
  alternativeRoutesChosen: number;
  trips: { date: string; route: string; choice: string; distanceKm: number; durationMin: number; co2Kg: number; co2AvoidedKg: number }[];
  days: number;
};

export async function buildDriverReport(d: DriverReportData) {
  const r = await Report.create(`Relatório do motorista: ${d.name}`, `Veículo ${d.vehicle ?? "-"} - últimos ${d.days} dias`);
  const emitted = d.trips.reduce((s, t) => s + t.co2Kg, 0);
  const avoided = d.trips.reduce((s, t) => s + t.co2AvoidedKg, 0);
  r.kpis([
    { label: "Viagens", value: String(d.trips.length) },
    { label: "CO₂ emitido", value: `${nf(emitted)} kg`, color: ORANGE },
    { label: "CO₂ evitado", value: `${nf(avoided)} kg` },
    { label: "Rotas alternativas (total)", value: String(d.alternativeRoutesChosen) },
  ]);
  r.heading("Selos");
  r.note(d.badges.map((b) => `${b.unlocked ? "[x]" : "[ ]"} ${b.name}`).join("    "));
  r.y -= 8;
  r.heading("Viagens");
  r.table(
    ["Data", "Rota", "Escolha", "Km", "Min", "CO₂ kg", "Evitado"],
    d.trips.map((t) => [dateBR(t.date), t.route, t.choice === "alternative" ? "Alternativa" : "Atual", nf(t.distanceKm, 1), String(t.durationMin), nf(t.co2Kg, 1), nf(t.co2AvoidedKg, 1)]),
    [62, 150, 72, 42, 38, 54, 50],
  );
  return r.finish();
}
