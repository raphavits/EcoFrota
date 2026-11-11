from django.db import models
from django.utils import timezone


class Vehicle(models.Model):
    code = models.CharField('código', max_length=20, unique=True)
    # Emissão esperada para este veículo (kg de CO₂ por km); base dos alertas de manutenção.
    expected_kg_per_km = models.DecimalField(max_digits=5, decimal_places=3, default='0.231')

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.code


class Driver(models.Model):
    name = models.CharField('nome', max_length=120)
    vehicle = models.OneToOneField(Vehicle, null=True, blank=True, on_delete=models.SET_NULL, related_name='driver')
    # Alimentado pela telemetria (frenagens bruscas); base do selo Piloto Eco.
    days_without_hard_braking = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Route(models.Model):
    slug = models.SlugField(unique=True)
    origin = models.CharField(max_length=80)
    destination = models.CharField(max_length=80)

    class Meta:
        ordering = ['id']

    @property
    def label(self):
        return f'{self.origin} → {self.destination}'

    def __str__(self):
        return self.label


class RouteOption(models.Model):
    CURRENT = 'current'
    ALTERNATIVE = 'alternative'
    KIND_CHOICES = [(CURRENT, 'Rota atual'), (ALTERNATIVE, 'Rota alternativa')]

    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='options')
    kind = models.CharField(max_length=12, choices=KIND_CHOICES)
    distance_km = models.DecimalField(max_digits=6, decimal_places=1)
    duration_min = models.PositiveSmallIntegerField()
    co2_kg = models.DecimalField(max_digits=6, decimal_places=2)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['route', 'kind'], name='uniq_route_kind')]

    def __str__(self):
        return f'{self.route} ({self.get_kind_display()})'


class Trip(models.Model):
    """Uma viagem concluída. Guarda um retrato dos valores, para o histórico não mudar se a rota for recalculada."""

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='trips')
    route = models.ForeignKey(Route, null=True, blank=True, on_delete=models.SET_NULL)
    choice = models.CharField(max_length=12, choices=RouteOption.KIND_CHOICES, default=RouteOption.CURRENT)
    date = models.DateField(default=timezone.localdate, db_index=True)
    distance_km = models.DecimalField(max_digits=7, decimal_places=1)
    duration_min = models.PositiveSmallIntegerField()
    co2_kg = models.DecimalField('CO₂ emitido (kg)', max_digits=7, decimal_places=2)
    co2_avoided_kg = models.DecimalField('CO₂ evitado (kg)', max_digits=7, decimal_places=2, default=0)
    empty_return = models.BooleanField('trajeto vazio', default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']


class Badge(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=160)

    def __str__(self):
        return self.name


class DriverBadge(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['driver', 'badge'], name='uniq_driver_badge')]


class Goal(models.Model):
    """Meta sustentável: quantos kg de CO₂ a frota deve evitar a cada 30 dias."""

    target_avoided_kg = models.DecimalField(max_digits=8, decimal_places=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        get_latest_by = 'created_at'
