from django.urls import path
from .views import ActivityLogListView

app_name = 'activity'

urlpatterns = [
    path('', ActivityLogListView.as_view(), name='activity-logs-list'),
]
