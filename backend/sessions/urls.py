from django.urls import path
from .views import SessionsView, CancelSeriesView

app_name = 'sessions'

urlpatterns = [
    path('', SessionsView.as_view(), name='sessions-list-create-update'),
    path('cancel-series/', CancelSeriesView.as_view(), name='cancel-series'),
    path('cancel-series', CancelSeriesView.as_view()),
]
