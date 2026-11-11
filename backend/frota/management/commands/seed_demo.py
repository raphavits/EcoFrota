"""Carrega dados SINTÉTICOS de demonstração (60 dias de viagens) que reproduzem os números do protótipo."""

import math
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from frota.models import Badge, Driver, DriverBadge, Goal, Route, RouteOption, Trip, Vehicle

ROUTES = [
    ('centro-sul', 'Centro', 'Zona Sul', (32, 24, 7.4), (29, 27, 5.1)),
    ('centro-norte', 'Centro', 'Zona Norte', (41, 38, 9.8), (38, 41, 7.6)),
    ('porto-distribuidora', 'Porto', 'Distribuidora', (18, 22, 5.2), (17, 24, 4.3)),
]

# nome, veículo, desvio de emissão por km vs esperado (%), variação de CO₂ vs 30 dias anteriores (%), dias sem frenagem brusca
DRIVERS = [
    ('Carlos Lima', 'VUC-03', -18, -18, 7),
    ('Ana Souza', 'TQ-11', -24, -24, 12),
    ('João Pires', 'TQ-14', -11, -11, 4),
    ('Marta Reis', 'TQ-08', -7, -7, 2),
    ('Paulo Nunes', 'TQ-02', 4, -3, 1),
    ('Rafael Dias', 'VUC-07', 22, 6, 0),
]

TARGET_EMITTED, TARGET_AVOIDED, GOAL_PCT = 3240, 980, 72
CARLOS_TODAY = [(Decimal('14.00'), Decimal('3.00'))] * 3  # 42 kg emitidos, 9 kg evitados hoje
P_ALTERNATIVE = 0.7


class Command(BaseCommand):
    help = 'Carrega dados de demonstração. Use --reset para apagar e recriar.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true')

    @transaction.atomic
    def handle(self, *args, **opts):
        if Driver.objects.exists() and not opts['reset']:
            self.stdout.write('Já existem dados. Use --reset para recriar.')
            return
        for model in (Trip, DriverBadge, Badge, Driver, Vehicle, RouteOption, Route, Goal):
            model.objects.all().delete()
        if connection.vendor == 'sqlite':  # recomeça os ids em 1 (o app usa DRIVER_ID=1 por padrão)
            with connection.cursor() as cur:
                cur.execute("DELETE FROM sqlite_sequence WHERE name LIKE 'frota_%'")

        rng = random.Random(42)
        today = timezone.localdate()

        routes = []
        for slug, origin, dest, cur, alt in ROUTES:
            r = Route.objects.create(slug=slug, origin=origin, destination=dest)
            for kind, (km, mn, co2) in ((RouteOption.CURRENT, cur), (RouteOption.ALTERNATIVE, alt)):
                RouteOption.objects.create(route=r, kind=kind, distance_km=km, duration_min=mn, co2_kg=co2)
            routes.append((r, cur))

        badges = {
            s: Badge.objects.create(slug=s, name=n, description=d)
            for s, n, d in [
                ('piloto-eco', 'Piloto Eco', '7 dias seguidos sem frenagem brusca'),
                ('rota-verde', 'Rota Verde', '10 rotas alternativas escolhidas'),
                ('meta-do-mes', 'Meta do mês', 'Atingir 100% da meta mensal de CO₂'),
            ]
        }
        Goal.objects.create(target_avoided_kg=round(TARGET_AVOIDED / (GOAL_PCT / 100), 1))

        base_kg_km = Decimal('0.231')
        all_trips = []  # (driver, day_offset, dict)
        for idx, (name, code, dev, change, braking) in enumerate(DRIVERS):
            vehicle = Vehicle.objects.create(code=code, expected_kg_per_km=base_kg_km)
            driver = Driver.objects.create(name=name, vehicle=vehicle, days_without_hard_braking=braking)
            if braking >= 7:
                DriverBadge.objects.create(driver=driver, badge=badges['piloto-eco'])

            raw = []
            for d in range(60):
                if idx == 0 and d == 0:
                    continue  # hoje do Carlos é fixo (abaixo)
                route, cur = rng.choice(routes)
                km = 30 * rng.uniform(0.92, 1.08)  # distância típica; a rota é só o rótulo no histórico
                co2 = km * float(base_kg_km) * (1 + dev / 100) * rng.uniform(0.995, 1.005)
                raw.append({'d': d, 'route': route, 'km': km, 'mn': 28 * km / 30, 'co2': co2,
                            'alt': rng.random() < P_ALTERNATIVE})
            all_trips.append((driver, raw, change))

        # Tendência contínua por motorista (exp(g·dias)) que impõe a variação vs 30 dias anteriores,
        # e escala que fecha o total de 30 dias em TARGET_EMITTED.
        today_total = float(sum(c for c, _ in CARLOS_TODAY))
        share = (TARGET_EMITTED - today_total) / len(all_trips)
        for driver, raw, change in all_trips:
            extra = today_total if driver.name == 'Carlos Lima' else 0
            want = (share + extra) / ((1 + change / 100) * share)  # soma anterior / soma atual

            def parts(g, raw=raw):
                cur = sum(t['co2'] * math.exp(g * (t['d'] - 15)) for t in raw if t['d'] < 30)
                prev = sum(t['co2'] * math.exp(g * (t['d'] - 15)) for t in raw if t['d'] >= 30)
                return cur, prev

            lo, hi = -0.1, 0.1
            for _ in range(60):
                mid = (lo + hi) / 2
                cur, prev = parts(mid)
                lo, hi = (mid, hi) if prev / cur < want else (lo, mid)
            g = (lo + hi) / 2
            c = share / parts(g)[0]
            for t in raw:
                f = c * math.exp(g * (t['d'] - 15))
                t['km'] *= f
                t['mn'] *= f
                t['co2'] *= f

        # CO₂ evitado: só as viagens por rota alternativa evitam; as escalas fecham o total de 30 dias.
        avoided_rest = TARGET_AVOIDED - float(sum(a for _, a in CARLOS_TODAY))
        window_target = TARGET_EMITTED - today_total
        alt_window = sum(t['co2'] for _, raw, _ in all_trips for t in raw if t['d'] < 30 and t['alt'])
        k_avoid_window = avoided_rest / alt_window
        k_avoid_prev = 0.20

        for driver, raw, _ in all_trips:
            for t in raw:
                k = (k_avoid_window if t['d'] < 30 else k_avoid_prev) if t['alt'] else 0
                Trip.objects.create(
                    driver=driver,
                    route=t['route'],
                    choice=RouteOption.ALTERNATIVE if t['alt'] else RouteOption.CURRENT,
                    date=today - timedelta(days=t['d']),
                    distance_km=round(t['km'], 1),
                    duration_min=max(1, round(t['mn'])),
                    co2_kg=round(t['co2'], 2),
                    co2_avoided_kg=round(t['co2'] * k, 2),
                )

        carlos = Driver.objects.get(name='Carlos Lima')
        for co2, avoided in CARLOS_TODAY:
            Trip.objects.create(
                driver=carlos, route=routes[0][0], choice=RouteOption.ALTERNATIVE, date=today,
                distance_km=74, duration_min=70, co2_kg=co2, co2_avoided_kg=avoided,
            )
        self.stdout.write(self.style.SUCCESS(f'Pronto: {Trip.objects.count()} viagens, {Driver.objects.count()} motoristas.'))
