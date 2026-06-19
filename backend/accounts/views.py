import logging
from django.conf import settings
from django.contrib.auth import login, logout, get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from students.models import Student
from activity.models import ActivityLog
from .serializers import UserSerializer, StudentSerializer
from .services import UserProvisioningService

logger = logging.getLogger(__name__)
User = get_user_model()

def verify_google_token(token: str) -> dict:
    """
    Verifies Google ID Token. If ALLOW_MOCK_AUTH is True and token starts with "mock:",
    allows mock auth of format "mock:email@example.com:Name:Avatar_URL" for dev/test convenience.
    """
    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
    allow_mock = getattr(settings, 'ALLOW_MOCK_AUTH', settings.DEBUG)
    
    if allow_mock and token.startswith("mock:"):
        parts = token.split(":", 3)
        email = parts[1]
        name = parts[2] if len(parts) > 2 else email.split("@")[0]
        picture = parts[3] if len(parts) > 3 else "https://example.com/avatar.png"
        return {"email": email, "name": name, "picture": picture}
        
    if not client_id:
        raise ValueError("GOOGLE_OAUTH_CLIENT_ID settings parameter is not configured.")

    try:
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id
        )
        return {
            "email": id_info.get("email"),
            "name": id_info.get("name"),
            "picture": id_info.get("picture")
        }
    except Exception as e:
        logger.error(f"Google ID Token verification exception: {e}")
        raise ValueError(f"Google token verification failed: {str(e)}")

class GoogleLoginView(APIView):
    """
    Accepts Google OAuth ID Token (credential JWT), validates against Google servers,
    provisions the user if they are whitelisted via an Invitation, and logs them in.
    """
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)  # Sets CSRF cookie on login call
    def post(self, request, *args, **kwargs):
        token = request.data.get("credential")
        if not token:
            return Response(
                {"error": "INVALID_INPUT", "message": "Google credential token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            google_claims = verify_google_token(token)
        except ValueError as e:
            return Response(
                {"error": "INVALID_CREDENTIAL", "message": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

        email = google_claims["email"]
        name = google_claims["name"]
        picture = google_claims["picture"]

        # Search for existing user
        user = User.objects.filter(email=email).first()
        is_new_user = False

        if not user:
            # First login: Onboard user using UserProvisioningService
            try:
                user = UserProvisioningService.provision_user(
                    email=email,
                    google_name=name,
                    google_avatar=picture
                )
                is_new_user = True
            except ValueError as e:
                # Returned if no pending invitation exists, or if student code is missing
                return Response(
                    {"error": "INVITATION_REQUIRED", "message": str(e)},
                    status=status.HTTP_403_FORBIDDEN
                )
            except Exception as e:
                logger.error(f"Error provisioning user {email}: {e}")
                return Response(
                    {"error": "PROVISIONING_FAILED", "message": "Failed to provision user profile."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Handle active check
        if not user.is_active:
            return Response(
                {"error": "USER_DISABLED", "message": "This account is inactive. Please contact admin."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Log session in Django
        login(request, user)

        # If user existed, update avatar if Google provided a new one
        if not is_new_user and picture and user.avatar_url != picture:
            user.avatar_url = picture
            user.save(update_fields=['avatar_url'])

        # Write login to ActivityLog (if not new user, who already gets an ONBOARDED log)
        if not is_new_user:
            student = Student.objects.filter(profile=user).first()
            ActivityLog.objects.create(
                actor=user,
                actor_email=user.email,
                actor_name=user.full_name,
                actor_role=user.role,
                action="LOGIN",
                entity_type="SESSION",
                entity_id=request.session.session_key or "unknown",
                entity_label="User Session",
                student=student
            )

        # Serialize user response details
        user_serializer = UserSerializer(user)
        response_data = {
            "status": "authenticated" if not is_new_user else "onboarded",
            "is_new_user": is_new_user,
            "user": user_serializer.data,
        }

        # Include Student specific info if applicable
        if user.role == 'STUDENT':
            student = Student.objects.filter(profile=user).first()
            if student:
                student_serializer = StudentSerializer(student)
                response_data["student_profile"] = student_serializer.data

        return Response(
            response_data,
            status=status.HTTP_201_CREATED if is_new_user else status.HTTP_200_OK
        )

class LogoutView(APIView):
    """
    Logs out the authenticated user session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        session_key = request.session.session_key
        
        # Log logout activity
        student = Student.objects.filter(profile=user).first() if user.role == 'STUDENT' else None
        ActivityLog.objects.create(
            actor=user,
            actor_email=user.email,
            actor_name=user.full_name,
            actor_role=user.role,
            action="LOGOUT",
            entity_type="SESSION",
            entity_id=session_key or "unknown",
            entity_label="User Session",
            student=student
        )

        logout(request)
        return Response(
            {"status": "logged_out", "message": "Successfully logged out."},
            status=status.HTTP_200_OK
        )

class MeView(APIView):
    """
    Returns the profile details of the current logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        user_serializer = UserSerializer(user)
        response_data = {
            "user": user_serializer.data
        }

        if user.role == 'STUDENT':
            student = Student.objects.filter(profile=user).first()
            if student:
                student_serializer = StudentSerializer(student)
                response_data["student_profile"] = student_serializer.data

        return Response(response_data, status=status.HTTP_200_OK)

class MentorListView(APIView):
    """
    GET /api/mentors/
    Returns list of all active mentors.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        mentors = User.objects.filter(role='MENTOR').order_by('full_name')
        data = [{"id": str(m.id), "full_name": m.full_name or "", "email": m.email} for m in mentors]
        return Response({"mentors": data}, status=status.HTTP_200_OK)

class TutorListView(APIView):
    """
    GET /api/tutors/
    Returns list of all active tutors.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        tutors = User.objects.filter(role='TUTOR').order_by('full_name')
        data = [{"id": str(t.id), "full_name": t.full_name or "", "email": t.email} for t in tutors]
        return Response({"tutors": data}, status=status.HTTP_200_OK)
