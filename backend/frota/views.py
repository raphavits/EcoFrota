import csv

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Driver, Route, RouteOption


def route_payload(route: Route) -> dict:
    options = {o.kind: o for o in route.options.all()}
    current, alt = options.get(RouteOption.CURRENT), options.get(RouteOption.ALTERNATIVE)

    def opt(o):
        return {
            'distance_km': float(o.distance_km),
            'duration_min': o.duration_min,
            'co2_kg': float(o.co2_kg),
        }

    return {
        'id': route.id,
        'slug': route.slug,
        'label': route.label,
        'origin': route.origin,
        'destination': route.destination,
        'current': opt(current) if current else None,
        'alternative': opt(alt) if alt else None,
        'co2_saved_pct': services.pct_saved(current, alt) if current and alt else 0,
        'extra_minutes': (alt.duration_min - current.duration_min) if current and alt else 0,
    }


class RouteListView(APIView):
    def get(self, request):
        routes = Route.objects.prefetch_related('options')
        return Response([route_payload(r) for r in routes])


class TripCreateSerializer(serializers.Serializer):
    driver = serializers.PrimaryKeyRelatedField(queryset=Driver.objects.all())
    route = serializers.PrimaryKeyRelatedField(queryset=Route.objects.all())
    choice = serializers.ChoiceField(choices=[RouteOption.CURRENT, RouteOption.ALTERNATIVE])


class TripCreateView(APIView):
    def post(self, request):
        ser = TripCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            trip, new_badges = services.register_trip(**ser.validated_data)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                'id': trip.id,
                'choice': trip.choice,
                'co2_kg': float(trip.co2_kg),
                'co2_avoided_kg': float(trip.co2_avoided_kg),
                'new_badges': [{'slug': b.slug, 'name': b.name} for b in new_badges],
                'summary': services.driver_summary(trip.driver),
            },
            status=status.HTTP_201_CREATED,
        )


class DriverSummaryView(APIView):
    def get(self, request, pk):
        return Response(services.driver_summary(get_object_or_404(Driver, pk=pk)))


class ManagerSummaryView(APIView):
    def get(self, request):
        return Response(services.manager_summary())


class FleetView(APIView):
    def get(self, request):
        return Response(services.fleet_status())


class ReportCsvView(APIView):
    """Relatório ESG em CSV (separador ';', abre direto no Excel em pt-BR)."""

    def get(self, request):
        summary = services.manager_summary()
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="ecofrota-esg.csv"'
        response.write('﻿')
        w = csv.writer(response, delimiter=';')
        w.writerow(['periodo_inicio', 'periodo_fim', 'co2_emitido_kg', 'co2_evitado_kg', 'meta_atingida_pct'])
        p = summary['period']
        w.writerow([p['start'], p['end'], summary['emitted_kg'], summary['avoided_kg'], summary['goal_pct']])
        w.writerow([])
        w.writerow(['posicao', 'motorista', 'variacao_co2_pct'])
        for r in summary['ranking']:
            w.writerow([r['position'], r['name'], r['change_pct']])
        return response
