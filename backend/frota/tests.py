from django.core.management import call_command
from django.test import TestCase

from .models import Badge, Driver, Route, RouteOption, Trip


class ApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', '--reset', verbosity=0)
        cls.carlos = Driver.objects.get(name='Carlos Lima')
        cls.route = Route.objects.get(slug='centro-sul')

    def test_route_comparison_matches_prototype(self):
        data = self.client.get('/api/routes').json()
        r = next(x for x in data if x['slug'] == 'centro-sul')
        self.assertEqual(r['current'], {'distance_km': 32.0, 'duration_min': 24, 'co2_kg': 7.4})
        self.assertEqual(r['alternative'], {'distance_km': 29.0, 'duration_min': 27, 'co2_kg': 5.1})
        self.assertEqual(r['co2_saved_pct'], 31)
        self.assertEqual(r['extra_minutes'], 3)

    def test_driver_summary_today(self):
        t = self.client.get(f'/api/drivers/{self.carlos.id}/summary').json()['today']
        self.assertEqual((t['emitted_kg'], t['avoided_kg'], t['reduction_pct'], t['routes']), (42.0, 9.0, 18, 3))

    def test_choosing_alternative_registers_trip_and_avoided_co2(self):
        before = Trip.objects.count()
        res = self.client.post('/api/trips', {'driver': self.carlos.id, 'route': self.route.id, 'choice': 'alternative'},
                               content_type='application/json')
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body['co2_avoided_kg'], 2.3)
        self.assertEqual(body['summary']['today']['routes'], 4)
        self.assertEqual(Trip.objects.count(), before + 1)

    def test_keeping_current_avoids_nothing(self):
        res = self.client.post('/api/trips', {'driver': self.carlos.id, 'route': self.route.id, 'choice': 'current'},
                               content_type='application/json')
        self.assertEqual(res.json()['co2_avoided_kg'], 0.0)

    def test_invalid_choice_is_rejected(self):
        res = self.client.post('/api/trips', {'driver': self.carlos.id, 'route': self.route.id, 'choice': 'voar'},
                               content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_route_green_badge_awarded_at_ten_alternatives(self):
        Trip.objects.filter(driver=self.carlos, choice=RouteOption.ALTERNATIVE).update(choice=RouteOption.CURRENT)
        names = []
        for _ in range(10):
            res = self.client.post('/api/trips', {'driver': self.carlos.id, 'route': self.route.id, 'choice': 'alternative'},
                                   content_type='application/json').json()
            names += [b['slug'] for b in res['new_badges']]
        self.assertEqual(names, ['rota-verde'])

    def test_manager_summary_matches_prototype(self):
        m = self.client.get('/api/manager/summary').json()
        self.assertEqual((m['emitted_kg'], m['avoided_kg'], m['goal_pct']), (3240, 980, 72))
        self.assertEqual([r['name'] for r in m['ranking'][:3]], ['Ana Souza', 'Carlos Lima', 'João Pires'])
        self.assertEqual(len(m['weekly_emitted']), 6)
        self.assertEqual([a['vehicle'] for a in m['alerts']], ['VUC-07'])

    def test_csv_report(self):
        res = self.client.get('/api/manager/report.csv')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res['Content-Type'])
        self.assertIn('Ana Souza', res.content.decode('utf-8'))

    def test_unknown_driver_404(self):
        self.assertEqual(self.client.get('/api/drivers/9999/summary').status_code, 404)
