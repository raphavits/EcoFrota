(() => {
  const D = window.ECO;
  const $ = (sel) => document.querySelector(sel);
  const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // ---------- estado persistido ----------
  const KEY = 'ecofrota:v1';
  const initialState = () => ({
    emitted: D.today.emitted,
    avoided: D.today.avoided,
    routes: D.today.routes,
    emptyTrips: D.today.emptyTrips,
    altChosen: 0,
    selectedRoute: 'centro-sul',
    log: [],
  });
  const load = () => {
    const base = initialState();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const k of ['emitted', 'avoided', 'routes', 'emptyTrips', 'altChosen']) {
        if (Number.isFinite(saved[k])) base[k] = saved[k];
      }
      if (saved.selectedRoute in D.routes) base.selectedRoute = saved.selectedRoute;
      if (Array.isArray(saved.log)) base.log = saved.log;
    } catch { /* usa o estado inicial */ }
    return base;
  };
  let state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* modo privado */ } };

  // ---------- cálculos ----------
  const savedPct = (r) => Math.round(((r.current.co2 - r.alt.co2) / r.current.co2) * 100);
  const todayPct = () => Math.round((state.avoided / (state.emitted + state.avoided)) * 100);
  const goalLabel = (pct) => `${fmt(pct)}%`;

  // ---------- componentes ----------
  const bars = (values, { labels, nowLast = true } = {}) => {
    const max = Math.max(...values);
    return `<div class="bars ${labels ? 'has-labels' : ''}" role="img" aria-label="Gráfico de barras: ${values.join(', ')}">
      ${values.map((v, i) => `<div class="bar ${nowLast && i === values.length - 1 ? 'now' : ''}" style="height:${Math.round((v / max) * 100)}%" title="${fmt(v)} kg">${labels ? `<span>${labels[i]}</span>` : ''}</div>`).join('')}
    </div>`;
  };

  const map = () => `
    <div class="map" aria-hidden="true">
      <svg viewBox="0 0 300 130" preserveAspectRatio="xMidYMid meet">
        <path d="M16 112 C 70 112, 90 28, 150 30 S 240 30, 284 14" fill="none" stroke="var(--muted)" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>
        <path d="M16 114 C 70 116, 130 112, 170 90 S 240 40, 284 14" fill="none" stroke="var(--green)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 8"/>
        <circle cx="16" cy="113" r="6" fill="var(--green)"/>
        <circle cx="284" cy="14" r="6" fill="var(--orange)"/>
      </svg>
    </div>`;

  // ---------- telas ----------
  const views = {};

  views['motorista/inicio'] = () => {
    const now = new Date();
    const pct = todayPct();
    const first = D.badges[0];
    const dow = now.getDay();
    const date = `${WEEKDAYS[dow]}${dow > 0 && dow < 6 ? '-feira' : ''}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`;
    return `
      <p class="eyebrow">Olá, ${D.driver.name}<span class="desk-inline"> · ${date.toLowerCase()}</span></p>
      <h1 class="title"><span class="mob-only">${date}</span><span class="desk-only">Seu impacto ambiental hoje</span></h1>
      <div class="driver-top stack">
        <section class="card" aria-label="CO₂ hoje versus referência">
          <p class="label">CO₂ hoje vs. referência</p>
          <p class="hero-num">−${pct}%</p>
          <p class="eyebrow">${fmt(state.emitted, 0)} kg emitidos · ${fmt(state.avoided, 0)} kg evitados</p>
        </section>
        <div class="row2 driver-stats">
          <div class="card tint stat"><b>${state.routes}</b><span class="label">Rotas hoje</span></div>
          <div class="card tint stat"><b>${state.emptyTrips}</b><span class="label">Trajeto vazio</span></div>
        </div>
      </div>
      <div class="grid-main">
        <section class="card desk-only" aria-label="Evolução">
          <p class="label">Evolução — últimos 6 dias</p>
          ${bars(D.dailyHistory.slice(0, 5).concat([state.emitted]), { labels: ['S', 'T', 'Q', 'Q', 'S', 'H'] })}
        </section>
        <section class="card badge" aria-label="Selo conquistado">
          <span class="ico" aria-hidden="true">★</span>
          <div><b>Selo: ${first.name}</b><small>${first.desc}</small></div>
        </section>
      </div>
      <div class="actions no-print"><a class="btn" href="#/motorista/rotas" style="text-decoration:none">Iniciar próxima rota</a></div>`;
  };

  views['motorista/rotas'] = () => {
    const r = D.routes[state.selectedRoute];
    const pct = savedPct(r);
    const dMin = r.alt.min - r.current.min;
    const dMinTxt = dMin > 0 ? `+${dMin} min` : `${dMin} min`;
    return `
      <p class="eyebrow">${r.label.replace('→', '→')}</p>
      <h1 class="title">Rota sugerida</h1>
      <div class="route-pick no-print" style="margin-top:12px" role="group" aria-label="Escolher trajeto">
        ${Object.entries(D.routes).map(([k, v]) => `<button class="chip" data-route="${k}" aria-pressed="${k === state.selectedRoute}">${v.label}</button>`).join('')}
      </div>
      <div class="routes-layout">
        ${map()}
        <div class="stack">
          <section class="card">
            <h3>Rota atual</h3>
            <div class="route-metrics">
              <div><b>${r.current.km} km</b><span>distância</span></div>
              <div><b>${r.current.min} min</b><span>tempo</span></div>
              <div><b>${fmt(r.current.co2, 1)} kg</b><span>CO₂</span></div>
            </div>
          </section>
          <section class="card sel">
            <h3>Rota alternativa</h3>
            <div class="route-metrics">
              <div><b>${r.alt.km} km</b><span>distância</span></div>
              <div><b>${r.alt.min} min</b><span>tempo</span></div>
              <div><b>${fmt(r.alt.co2, 1)} kg</b><span>CO₂</span></div>
            </div>
            <p class="gain">−${pct}% de CO₂ · ${dMinTxt}</p>
          </section>
          <p class="eyebrow">A alternativa evita vias congestionadas e trechos de para-e-siga, reduzindo o consumo de diesel do caminhão-tanque.</p>
        </div>
      </div>
      <div class="actions no-print">
        <button class="btn" id="use-alt">Usar rota alternativa</button>
        <button class="btn ghost" id="keep">Manter rota atual</button>
      </div>`;
  };

  views['motorista/perfil'] = () => `
    <p class="eyebrow">${D.driver.vehicle}</p>
    <h1 class="title">${D.driver.fullName}</h1>
    <div class="stack">
      <section class="card"><p class="label">Rotas alternativas escolhidas</p><p class="hero-num">${state.altChosen}</p></section>
      <section class="card">
        <p class="label">Selos</p>
        <div class="stack" style="margin-top:12px">
          ${D.badges.map((b) => `<div class="badge ${b.unlocked ? '' : 'locked'}"><span class="ico" aria-hidden="true">${b.unlocked ? '★' : '☆'}</span><div><b>${b.name}</b><small>${b.desc}</small></div></div>`).join('')}
        </div>
      </section>
      <button class="btn ghost no-print" id="reset">Reiniciar dados de demonstração</button>
    </div>`;

  views['gestor/painel'] = () => {
    const m = D.manager;
    return `
      <p class="eyebrow">Frota — ${m.month}</p>
      <h1 class="title">Painel do gestor</h1>
      <div class="row3 kpis stack">
        <section class="card kpi"><p class="label">CO₂ emitido</p><p class="val warn">${fmt(m.emitted)} <span class="unit">kg</span></p></section>
        <section class="card kpi"><p class="label">CO₂ evitado</p><p class="val">${fmt(m.avoided)} <span class="unit">kg</span></p></section>
        <section class="card kpi desk-only"><p class="label">Meta do mês</p><p class="val">${goalLabel(m.goalPct)}</p><div class="meter"><i style="width:${m.goalPct}%"></i></div></section>
      </div>
      <div class="grid-main">
        <section class="card"><p class="label">Evolução — últimas 6 semanas</p>${bars(m.weeks, { labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] })}</section>
        <section class="card"><p class="label">Ranking ambiental</p>
          <ol class="rank">${m.ranking.slice(0, 3).map((p, i) => `<li><span class="n">0${i + 1}</span><span class="name">${p.name}</span><span class="pct">${p.pct}% CO₂</span></li>`).join('')}</ol>
        </section>
      </div>
      <div style="margin-top:14px">${alerts()}</div>`;
  };

  const alerts = () => D.manager.fleet.filter((v) => v.dev > 15)
    .map((v) => `<div class="alert" role="alert">⚠ Veículo ${v.id} está ${v.dev}% acima do padrão de emissão esperado.</div>`).join('');

  views['gestor/frota'] = () => `
    <p class="eyebrow">${D.manager.fleet.length} veículos monitorados</p>
    <h1 class="title">Frota</h1>
    <div class="stack">
      <section class="card">
        <table class="table">
          <thead><tr><th>Veículo</th><th>Motorista</th><th>vs. esperado</th></tr></thead>
          <tbody>${D.manager.fleet.map((v) => `<tr><td><b>${v.id}</b></td><td>${v.driver}</td><td><span class="tag ${v.dev > 15 ? 'warn' : ''}">${v.dev > 0 ? '+' : ''}${v.dev}%</span></td></tr>`).join('')}</tbody>
        </table>
      </section>
      ${alerts()}
      <p class="eyebrow">Acima de 15% do padrão: checar regulagem do motor, calibragem dos pneus e sistema de injeção.</p>
    </div>`;

  views['gestor/relatorios'] = () => {
    const m = D.manager;
    const total = m.emitted + m.avoided;
    return `
      <p class="eyebrow">Relatório ESG · ${m.month}</p>
      <h1 class="title">Relatórios</h1>
      <div class="stack">
        <section class="card">
          <p class="label">Redução frente ao cenário de referência</p>
          <p class="hero-num">−${Math.round((m.avoided / total) * 100)}%</p>
          <p class="eyebrow">${fmt(m.avoided)} kg de CO₂ evitados de ${fmt(total)} kg projetados</p>
          <div class="meter"><i style="width:${m.goalPct}%"></i></div>
          <p class="eyebrow" style="margin-top:6px">${m.goalPct}% da meta mensal atingida</p>
        </section>
        <section class="card">
          <p class="label">Ranking completo</p>
          <ol class="rank">${m.ranking.map((p, i) => `<li><span class="n">0${i + 1}</span><span class="name">${p.name}</span><span class="pct">${p.pct}% CO₂</span></li>`).join('')}</ol>
        </section>
        <div class="actions no-print">
          <button class="btn" id="csv">Baixar CSV</button>
          <button class="btn ghost" id="print">Imprimir / salvar PDF</button>
        </div>
      </div>`;
  };

  // ---------- navegação ----------
  const NAV = {
    motorista: [['inicio', 'Início'], ['rotas', 'Rotas'], ['perfil', 'Perfil']],
    gestor: [['painel', 'Painel'], ['frota', 'Frota'], ['relatorios', 'Relatórios']],
  };

  const parse = () => {
    const [role, page] = location.hash.replace(/^#\//, '').split('/');
    const r = NAV[role] ? role : 'motorista';
    const p = NAV[r].some(([k]) => k === page) ? page : NAV[r][0][0];
    return { role: r, page: p };
  };

  const render = () => {
    const { role, page } = parse();
    const link = ([k, name]) => `<a href="#/${role}/${k}" ${k === page ? 'aria-current="page"' : ''}>${name}</a>`;
    $('#side-nav').innerHTML = NAV[role].map(link).join('');
    $('#bottom-nav').innerHTML = NAV[role].map(link).join('');
    const sw = ['motorista', 'gestor'].map((r) => `<button data-role="${r}" aria-pressed="${r === role}">${r === 'motorista' ? 'Motorista' : 'Gestor'}</button>`).join('');
    $('#role-switch-side').innerHTML = sw;
    $('#role-switch-top').innerHTML = sw;
    $('#view').innerHTML = views[`${role}/${page}`]();
    document.title = `EcoFrota · ${NAV[role].find(([k]) => k === page)[1]}`;
    bind(role, page);
  };

  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.id);
    toast.id = setTimeout(() => t.classList.remove('show'), 2800);
  };

  const download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
  };

  const bind = (role, page) => {
    document.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/${b.dataset.role}`; }));
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

    document.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', () => {
      state.selectedRoute = b.dataset.route; save(); render();
    }));

    on('#use-alt', () => {
      const r = D.routes[state.selectedRoute];
      const saved = +(r.current.co2 - r.alt.co2).toFixed(1);
      state.emitted = +(state.emitted + r.alt.co2).toFixed(1);
      state.avoided = +(state.avoided + saved).toFixed(1);
      state.routes += 1;
      state.altChosen += 1;
      state.log.push({ route: r.label, co2Saved: saved, at: new Date().toISOString() });
      save();
      toast(`Rota alternativa ativada · ${fmt(saved, 1)} kg de CO₂ evitados`);
      setTimeout(() => { location.hash = '#/motorista/inicio'; }, 900);
    });
    on('#keep', () => {
      const r = D.routes[state.selectedRoute];
      state.emitted = +(state.emitted + r.current.co2).toFixed(1);
      state.routes += 1;
      save();
      toast('Rota atual mantida');
      setTimeout(() => { location.hash = '#/motorista/inicio'; }, 900);
    });
    on('#reset', () => { state = initialState(); save(); toast('Dados reiniciados'); render(); });
    on('#print', () => window.print());
    on('#csv', () => {
      const m = D.manager;
      const rows = [['posicao', 'motorista', 'variacao_co2_pct'], ...m.ranking.map((p, i) => [i + 1, p.name, p.pct])];
      rows.push([], ['co2_emitido_kg', m.emitted], ['co2_evitado_kg', m.avoided], ['meta_pct', m.goalPct]);
      download(`ecofrota-esg-${m.month.replace('/', '-')}.csv`, rows.map((r) => r.join(';')).join('\n'), 'text/csv;charset=utf-8');
    });
    window.scrollTo(0, 0);
  };

  window.addEventListener('hashchange', render);
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
