from django.contrib import admin

from .models import Badge, Driver, DriverBadge, Goal, Route, RouteOption, Trip, Vehicle


class RouteOptionInline(admin.TabularInline):
    model = RouteOption
    extra = 0


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    inlines = [RouteOptionInline]
    list_display = ('slug', 'origin', 'destination')


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('date', 'driver', 'choice', 'distance_km', 'co2_kg', 'co2_avoided_kg')
    list_filter = ('choice', 'driver')
    date_hierarchy = 'date'


admin.site.register([Vehicle, Driver, Badge, DriverBadge, Goal])
