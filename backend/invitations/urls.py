from django.urls import path
from .views import LookupStudentView, CreateInvitationView

app_name = 'invitations'

urlpatterns = [
    path('lookup-student/', LookupStudentView.as_view(), name='lookup-student'),
    path('create-student-invitation/', CreateInvitationView.as_view(), name='create-student-invitation'),
    path('', CreateInvitationView.as_view(), name='create-invitation'),
]
