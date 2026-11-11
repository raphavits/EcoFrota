# EcoFrota

Otimização de rotas e sustentabilidade no transporte de combustíveis. PWA em **Next.js** (motorista no celular, gestor no computador) com **API em Django**.

```
backend/    Django + Django REST Framework (SQLite)
frontend/   Next.js (App Router, TypeScript)
ecofrota/   protótipo estático original (HTML/CSS/JS)
EcoFrota.html   protótipo estático em um único arquivo, para enviar a alguém
```

## Rodar

Backend (porta 8000):

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # Python 3.10+
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo --reset      # dados sintéticos de demonstração
.venv/bin/python manage.py runserver 8000
```

Frontend (porta 3000), em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:3000. Se a porta 8000 estiver ocupada, rode o Django em outra e aponte o Next para ela: `API_URL=http://127.0.0.1:8100 npm run dev`.

Variáveis do frontend (veja `frontend/.env.example`): `API_URL` e `DRIVER_ID` (motorista que usa o app; ainda não há login, e `seed_demo` cria o Carlos com id 1).

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/routes` | Rotas com atual × alternativa (km, min, kg CO₂, % economizado) |
| POST | `/api/trips` | Registra a escolha `{driver, route, choice: "alternative" \| "current"}` e devolve selos novos |
| GET | `/api/drivers/<id>/summary` | Painel do motorista: hoje, últimos 6 dias, selos |
| GET | `/api/manager/summary` | Painel do gestor: emitido/evitado (30 dias), meta, 6 semanas, ranking, alertas |
| GET | `/api/manager/fleet` | Emissão por km de cada veículo contra o esperado |
| GET | `/api/manager/report.csv` | Relatório ESG em CSV |

Regras: CO₂ evitado = CO₂ da rota atual − CO₂ da rota escolhida. O ranking compara os últimos 30 dias com os 30 anteriores. Veículo com emissão por km mais de 15% acima do esperado (14 dias) gera alerta (`ALERT_THRESHOLD_PCT`). Selos: Piloto Eco (7 dias sem frenagem brusca) e Rota Verde (10 rotas alternativas).

Testes do backend: `cd backend && .venv/bin/python manage.py test`.

## Falta para produção

- Login e permissões (hoje a API é aberta e o motorista vem de `DRIVER_ID`).
- Telemetria real (frenagens bruscas, consumo) e cálculo de rotas por API de mapas; hoje as rotas e as emissões vêm do banco.
- Dados de demonstração são sintéticos. Em produção, troque SQLite por PostgreSQL e defina `DJANGO_DEBUG=0`, `DJANGO_SECRET_KEY` e `DJANGO_ALLOWED_HOSTS`.
- Ícones PNG (192/512 px) para instalação em todos os celulares.
