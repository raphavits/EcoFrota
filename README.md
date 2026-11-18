# EcoFrota

Otimização de rotas e sustentabilidade no transporte de combustíveis. PWA em **Next.js** (motorista no celular, gestor no computador) com banco **Firebase (Firestore)**, pronto para hospedar na **Vercel**.

```
frontend/        app Next.js (telas, regras de negócio e API no mesmo projeto)
firestore.rules  regras do Firestore (bloqueiam acesso direto; só o servidor do Next acessa)
ecofrota/        protótipo estático original (HTML/CSS/JS)
EcoFrota.html    protótipo estático em um único arquivo
```

## O que o sistema faz

- **Cálculo por rotas estabelecidas (ruas fictícias):** cada rota tem uma lista de trechos (rua, km, velocidade, trânsito, paradas). Distância, tempo e CO₂ são calculados a partir deles, sem API de mapas. Veja `frontend/lib/emissions.ts`.
- **CRUD no banco:** veículos (`/gestor/frota`), motoristas (`/gestor/motoristas`) e rotas (`/gestor/rotas`), com validação. O cadastro de rota mostra o cálculo em tempo real.
- **Motorista:** escolhe origem e destino, compara rota atual × alternativa e registra a viagem (CO₂ evitado, selos).
- **Gestor:** painel (emitido × evitado, meta, 6 semanas, ranking, alertas de manutenção) e relatórios.
- **Relatórios em PDF:** ESG da frota e individual por motorista (`/gestor/relatorios`). Também há CSV.

## Rodar no seu computador

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:3000. **Sem Firebase configurado, o app roda em modo demonstração**: os dados de exemplo ficam só na memória (somem ao reiniciar). Serve para ver e testar tudo.

```bash
npm test        # 12 testes (cálculo, painéis, CRUD, PDF)
npm run lint
npm run build
```

## Conectar ao Firebase (Firestore)

1. Em https://console.firebase.google.com, **Adicionar projeto** (ex.: `ecofrota`). O Google Analytics pode ficar desligado.
2. No menu **Build > Firestore Database**, clique em **Criar banco de dados**. Escolha o modo de **produção** e uma região (ex.: `southamerica-east1`, São Paulo).
3. Na aba **Regras** do Firestore, cole o conteúdo de `firestore.rules` e publique. Ele bloqueia qualquer acesso direto; o app acessa o banco pelo servidor.
4. Em **Configurações do projeto (engrenagem) > Contas de serviço**, clique em **Gerar nova chave privada**. Baixa um arquivo `.json`. **Nunca coloque esse arquivo no git** (ele dá acesso total ao banco).
5. Converta para uma linha de texto (base64):
   ```bash
   base64 -i caminho/da/chave.json | tr -d '\n'
   ```
6. Crie `frontend/.env.local` (já está no `.gitignore`) com:
   ```
   FIREBASE_SERVICE_ACCOUNT=COLE_AQUI_O_BASE64
   DEFAULT_DRIVER_ID=carlos
   ```
7. Grave os dados de demonstração (**apaga** as coleções `vehicles`, `drivers`, `routes`, `trips` e `settings`):
   ```bash
   cd frontend
   npm run seed -- --yes
   ```
8. `npm run dev`. O aviso de modo demonstração some e o que você cadastra fica salvo no Firestore.

Os dados de demonstração são relativos à data de hoje (últimos 60 dias). Com o passar do tempo, rode o seed de novo para renová-los.

## Hospedar na Vercel

1. Suba o projeto para o GitHub (já feito).
2. Em https://vercel.com, **Add New > Project** e importe o repositório `EcoFrota`.
3. Em **Root Directory**, escolha `frontend` (o app Next.js está nessa pasta). O framework é detectado sozinho.
4. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT` | o mesmo base64 do passo 5 acima |
   | `DEFAULT_DRIVER_ID` | `carlos` |
   | `BASIC_AUTH_USER` | um usuário à sua escolha |
   | `BASIC_AUTH_PASSWORD` | uma senha forte |

   **Não deixe de definir `BASIC_AUTH_USER` e `BASIC_AUTH_PASSWORD`.** Ainda não há login de verdade; sem isso, qualquer pessoa com o link cria, edita e apaga cadastros. Com eles, o navegador pede usuário e senha.
5. Clique em **Deploy**. A cada `git push` na branch principal, a Vercel publica de novo.

Se você publicar **sem** `FIREBASE_SERVICE_ACCOUNT`, o site sobe em modo demonstração. Na Vercel isso significa dados em memória que mudam entre requisições e somem a qualquer momento. Use só para olhar, não para cadastrar.

## Estrutura do banco (Firestore)

| Coleção | Campos |
|---|---|
| `vehicles` | `code`, `expectedKgPerKm` |
| `drivers` | `name`, `vehicleId`, `daysWithoutHardBraking`, `badges[]` |
| `routes` | `origin`, `destination`, `current[]`, `alternative[]` (trechos: `street`, `km`, `speedKmh`, `traffic`, `stops`) |
| `trips` | `driverId`, `routeId`, `choice`, `date`, `distanceKm`, `durationMin`, `co2Kg`, `co2AvoidedKg`, `emptyReturn` |
| `settings` | documento `goal` com `targetAvoidedKg` |

Os painéis do gestor leem as viagens dos últimos 60 dias de uma vez. No plano gratuito do Firestore (50 mil leituras por dia) isso comporta algumas centenas de acessos ao painel por dia.

## Regras de negócio

- CO₂ evitado = CO₂ da rota atual − CO₂ da rota escolhida.
- Ranking: variação do CO₂ emitido nos últimos 30 dias contra os 30 anteriores, por motorista.
- Alerta de manutenção: veículo com emissão por km (14 dias) mais de 15% acima do esperado.
- Selos: Piloto Eco (7 dias sem frenagem brusca) e Rota Verde (10 rotas alternativas).

## Falta para produção

- Login por perfil (motorista só vê e cria os próprios dados; gestor administra). Hoje há uma senha única opcional (`BASIC_AUTH_*`) e o motorista do app vem de `DEFAULT_DRIVER_ID`.
- Telemetria real (frenagens bruscas, consumo) e, se quiser, rotas reais por API de mapas. Hoje tudo vem dos trechos cadastrados.
- Ícones PNG (192/512 px) para instalação em todos os celulares.
