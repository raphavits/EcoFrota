from django.urls import path

from . import views

urlpatterns = [
    path('routes', views.RouteListView.as_view()),
    path('trips', views.TripCreateView.as_view()),
    path('drivers/<int:pk>/summary', views.DriverSummaryView.as_view()),
    path('manager/summary', views.ManagerSummaryView.as_view()),
    path('manager/fleet', views.FleetView.as_view()),
    path('manager/report.csv', views.ReportCsvView.as_view()),
]
