// Ilustração do trajeto (não é um mapa real): rota atual em cinza, alternativa pontilhada.
export function RouteMap() {
  return (
    <div className="map" aria-hidden="true">
      <svg viewBox="0 0 300 130" preserveAspectRatio="xMidYMid meet">
        <path d="M16 112 C 70 112, 90 28, 150 30 S 240 30, 284 14" fill="none" stroke="var(--muted)" strokeOpacity=".45" strokeWidth="5" strokeLinecap="round" />
        <path d="M16 114 C 70 116, 130 112, 170 90 S 240 40, 284 14" fill="none" stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1 8" />
        <circle cx="16" cy="113" r="6" fill="var(--green)" />
        <circle cx="284" cy="14" r="6" fill="var(--orange)" />
      </svg>
    </div>
  );
}
