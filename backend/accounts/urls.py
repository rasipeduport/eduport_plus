from django.urls import path
from .views import GoogleLoginView, LogoutView, MeView

app_name = 'accounts'

urlpatterns = [
    path('google/', GoogleLoginView.as_view(), name='google-login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
]
