"""Regras de negócio do EcoFrota: viagens, estatísticas, ranking, alertas e selos."""

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import Badge, Driver, DriverBadge, Goal, Route, RouteOption, Trip, Vehicle

ZERO = Decimal('0')


def _num(value, digits=1):
    return round(float(value or 0), digits)


def pct_saved(current: RouteOption, alternative: RouteOption) -> int:
    if not current.co2_kg:
        return 0
    return round(float((current.co2_kg - alternative.co2_kg) / current.co2_kg) * 100)


# ---------- viagens ----------

@transaction.atomic
def register_trip(driver: Driver, route: Route, choice: str) -> tuple[Trip, list[Badge]]:
    """Registra a escolha do motorista. O CO₂ evitado é a diferença para a rota atual (referência)."""
    options = {o.kind: o for o in route.options.all()}
    if RouteOption.CURRENT not in options or choice not in options:
        raise ValueError('Rota sem opções cadastradas para esta escolha.')
    current, chosen = options[RouteOption.CURRENT], options[choice]
    trip = Trip.objects.create(
        driver=driver,
        route=route,
        choice=choice,
        distance_km=chosen.distance_km,
        duration_min=chosen.duration_min,
        co2_kg=chosen.co2_kg,
        co2_avoided_kg=current.co2_kg - chosen.co2_kg,
    )
    return trip, award_badges(driver)


def award_badges(driver: Driver) -> list[Badge]:
    earned = []
    rules = {
        'piloto-eco': driver.days_without_hard_braking >= 7,
        'rota-verde': driver.trips.filter(choice=RouteOption.ALTERNATIVE).count() >= 10,
    }
    for slug, ok in rules.items():
        if not ok:
            continue
        badge = Badge.objects.filter(slug=slug).first()
        if badge and not DriverBadge.objects.filter(driver=driver, badge=badge).exists():
            DriverBadge.objects.create(driver=driver, badge=badge)
            earned.append(badge)
    return earned


# ---------- motorista ----------

def driver_summary(driver: Driver) -> dict:
    today = timezone.localdate()
    day = driver.trips.filter(date=today).aggregate(
        emitted=Sum('co2_kg'),
        avoided=Sum('co2_avoided_kg'),
        routes=Count('id'),
        empty=Count('id', filter=Q(empty_return=True)),
    )
    emitted, avoided = day['emitted'] or ZERO, day['avoided'] or ZERO
    total = emitted + avoided
    reduction = round(float(avoided / total) * 100) if total else 0

    series = []
    for i in range(5, -1, -1):
        d = today - timedelta(days=i)
        s = driver.trips.filter(date=d).aggregate(v=Sum('co2_kg'))['v']
        series.append({'date': d.isoformat(), 'emitted_kg': _num(s)})

    earned = {b.badge_id: b for b in driver.badges.select_related('badge')}
    badges = [
        {
            'slug': b.slug,
            'name': b.name,
            'description': b.description,
            'unlocked': b.id in earned,
        }
        for b in Badge.objects.order_by('id')
    ]
    return {
        'driver': {'id': driver.id, 'name': driver.name, 'vehicle': driver.vehicle.code if driver.vehicle else None},
        'today': {
            'date': today.isoformat(),
            'emitted_kg': _num(emitted),
            'avoided_kg': _num(avoided),
            'reduction_pct': reduction,
            'routes': day['routes'],
            'empty_trips': day['empty'],
        },
        'daily_emitted': series,
        'alternative_routes_chosen': driver.trips.filter(choice=RouteOption.ALTERNATIVE).count(),
        'badges': badges,
    }


# ---------- gestor ----------

def _window(days: int, offset: int = 0):
    end = timezone.localdate() - timedelta(days=offset)
    return end - timedelta(days=days - 1), end


def manager_summary() -> dict:
    start, end = _window(30)
    trips = Trip.objects.filter(date__range=(start, end))
    totals = trips.aggregate(emitted=Sum('co2_kg'), avoided=Sum('co2_avoided_kg'))
    emitted, avoided = totals['emitted'] or ZERO, totals['avoided'] or ZERO

    goal = Goal.objects.order_by('-created_at').first()
    goal_pct = min(round(float(avoided / goal.target_avoided_kg) * 100), 999) if goal and goal.target_avoided_kg else None

    return {
        'period': {'start': start.isoformat(), 'end': end.isoformat(), 'days': 30},
        'emitted_kg': _num(emitted, 0),
        'avoided_kg': _num(avoided, 0),
        'goal_pct': goal_pct,
        'weekly_emitted': weekly_series(),
        'ranking': ranking(),
        'alerts': fleet_alerts(),
    }


def weekly_series(weeks: int = 6) -> list[dict]:
    """CO₂ emitido por bloco de 7 dias, do mais antigo para o mais recente."""
    out = []
    for i in range(weeks - 1, -1, -1):
        start, end = _window(7, offset=7 * i)
        v = Trip.objects.filter(date__range=(start, end)).aggregate(v=Sum('co2_kg'))['v']
        out.append({'label': f'S{weeks - i}', 'start': start.isoformat(), 'end': end.isoformat(), 'emitted_kg': _num(v, 0)})
    return out


def ranking() -> list[dict]:
    """Taxa de redução de CO₂: últimos 30 dias contra os 30 dias anteriores, por motorista."""
    cur_start, cur_end = _window(30)
    prev_start, prev_end = _window(30, offset=30)
    rows = []
    for d in Driver.objects.all():
        cur = d.trips.filter(date__range=(cur_start, cur_end)).aggregate(v=Sum('co2_kg'))['v'] or ZERO
        prev = d.trips.filter(date__range=(prev_start, prev_end)).aggregate(v=Sum('co2_kg'))['v'] or ZERO
        if not prev:
            continue  # sem base de comparação
        rows.append({'driver_id': d.id, 'name': d.name, 'change_pct': round(float(cur / prev - 1) * 100)})
    rows.sort(key=lambda r: r['change_pct'])
    for i, r in enumerate(rows, start=1):
        r['position'] = i
    return rows


def fleet_status() -> list[dict]:
    """Emissão por km dos últimos 14 dias contra o padrão esperado de cada veículo."""
    start, end = _window(14)
    out = []
    for v in Vehicle.objects.select_related('driver'):
        agg = Trip.objects.filter(driver__vehicle=v, date__range=(start, end)).aggregate(
            co2=Sum('co2_kg'), km=Sum('distance_km')
        )
        deviation = None
        if agg['km']:
            actual = agg['co2'] / agg['km']
            deviation = round(float(actual / v.expected_kg_per_km - 1) * 100)
        out.append({
            'vehicle': v.code,
            'driver': getattr(v, 'driver', None) and v.driver.name,
            'deviation_pct': deviation,
            'alert': deviation is not None and deviation > settings.ALERT_THRESHOLD_PCT,
        })
    return out


def fleet_alerts() -> list[dict]:
    return [
        {
            'vehicle': s['vehicle'],
            'deviation_pct': s['deviation_pct'],
            'message': f"Veículo {s['vehicle']} está {s['deviation_pct']}% acima do padrão de emissão esperado.",
        }
        for s in fleet_status()
        if s['alert']
    ]
