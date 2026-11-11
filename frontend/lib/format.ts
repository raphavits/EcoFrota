const nf = (digits: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const kg = (n: number, digits = 0) => nf(digits).format(n);

export const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

const TZ = "America/Sao_Paulo";

export function longDate(iso: string) {
  const d = new Date(`${iso}T12:00:00-03:00`);
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function weekdayInitial(iso: string) {
  const d = new Date(`${iso}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "narrow", timeZone: TZ }).format(d).toUpperCase();
}
