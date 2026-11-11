// Dados de demonstração do EcoFrota. Em produção, virão da API / telemetria.
window.ECO = {
  driver: { name: 'Carlos', fullName: 'Carlos Lima', vehicle: 'VUC-03' },

  // Dia base (valores do protótipo)
  today: { emitted: 42, avoided: 9, routes: 3, emptyTrips: 0 },
  dailyHistory: [48, 45, 46, 41, 43, 38], // kg CO₂ emitidos nos últimos 6 dias

  // Fator de emissão (kg CO₂/km) — diesel, caminhão-tanque. Valores calibrados com o protótipo.
  routes: {
    'centro-sul': {
      label: 'Centro → Zona Sul',
      current: { km: 32, min: 24, co2: 7.4 },
      alt: { km: 29, min: 27, co2: 5.1 },
    },
    'centro-norte': {
      label: 'Centro → Zona Norte',
      current: { km: 41, min: 38, co2: 9.8 },
      alt: { km: 38, min: 41, co2: 7.6 },
    },
    'porto-distrib': {
      label: 'Porto → Distribuidora',
      current: { km: 18, min: 22, co2: 5.2 },
      alt: { km: 17, min: 24, co2: 4.3 },
    },
  },

  manager: {
    month: 'setembro/2026',
    emitted: 3240,
    avoided: 980,
    goalPct: 72,
    weeks: [820, 790, 770, 730, 700, 640], // CO₂ emitido por semana (kg)
    ranking: [
      { name: 'Ana Souza', pct: -24 },
      { name: 'Carlos Lima', pct: -18 },
      { name: 'João Pires', pct: -11 },
      { name: 'Marta Reis', pct: -7 },
      { name: 'Paulo Nunes', pct: -3 },
    ],
    fleet: [
      { id: 'VUC-03', driver: 'Carlos Lima', dev: -18 },
      { id: 'TQ-11', driver: 'Ana Souza', dev: -24 },
      { id: 'TQ-14', driver: 'João Pires', dev: -11 },
      { id: 'TQ-08', driver: 'Marta Reis', dev: -7 },
      { id: 'TQ-02', driver: 'Paulo Nunes', dev: 4 },
      { id: 'VUC-07', driver: 'Rafael Dias', dev: 22 },
    ],
  },

  badges: [
    { id: 'piloto', name: 'Piloto Eco', desc: '7 dias seguidos sem frenagem brusca', unlocked: true },
    { id: 'rota', name: 'Rota Verde', desc: '10 rotas alternativas escolhidas', unlocked: false },
    { id: 'meta', name: 'Meta do mês', desc: 'Atingir 100% da meta mensal de CO₂', unlocked: false },
  ],
};
