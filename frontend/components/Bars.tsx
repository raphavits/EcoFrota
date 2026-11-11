type Props = { values: number[]; labels: string[]; unit?: string };

export function Bars({ values, labels, unit = "kg" }: Props) {
  const max = Math.max(...values, 1);
  return (
    <div
      className="bars has-labels"
      role="img"
      aria-label={`Gráfico de barras: ${labels.map((l, i) => `${l} ${values[i]} ${unit}`).join(", ")}`}
    >
      {values.map((v, i) => (
        <div
          key={labels[i]}
          className={`bar${i === values.length - 1 ? " now" : ""}`}
          style={{ height: `${Math.max(Math.round((v / max) * 100), 4)}%` }}
          title={`${v} ${unit}`}
        >
          <span>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
