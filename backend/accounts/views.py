import logging
from django.conf import settings
from django.shortcuts import get_object_or_404
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
    authentication_classes = []

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

        # Check if the email exists in the Invitations table (whitelisted_emails)
        from invitations.models import Invitation
        if not Invitation.objects.filter(email=email).exists():
            return Response(
                {
                    "error": "ACCESS_RESTRICTED",
                    "message": "Access Restricted\n\nYour email is not authorized to access EduPlus.\n\nPlease contact your administrator for access."
                },
                status=status.HTTP_403_FORBIDDEN
            )



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

from rest_framework.authentication import SessionAuthentication

class CSRFExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Skip CSRF check for logout

class LogoutView(APIView):
    """
    Logs out the authenticated user session.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CSRFExemptSessionAuthentication]

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
    Returns list of active mentors with their assigned student counts.
    If ?all=true is passed, returns active mentors + pending mentor invitations.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from django.db.models import Count
        from invitations.models import Invitation, InvitationStatusChoices
        
        # Query active mentors
        mentors = User.objects.filter(role='MENTOR').annotate(
            assigned_students_count=Count('mentored_students')
        ).order_by('-created_at')
        
        active_data = [
            {
                "kind": "active",
                "id": str(m.id),
                "full_name": m.full_name or "",
                "email": m.email,
                "avatar_url": m.avatar_url or None,
                "mobile_number": m.mobile_number or "",
                "created_at": m.created_at.isoformat(),
                "invited_by_profile": {
                    "id": str(m.invited_by.id),
                    "full_name": m.invited_by.full_name or "",
                    "email": m.invited_by.email
                } if m.invited_by else None,
                "assigned_students_count": m.assigned_students_count
            }
            for m in mentors
        ]
        
        # Backward compatibility for dropdown selects (which don't pass ?all=true)
        if request.GET.get('all') != 'true':
            return Response(
                {"mentors": [{"id": d["id"], "full_name": d["full_name"], "email": d["email"]} for d in active_data]},
                status=status.HTTP_200_OK
            )
            
        return Response({"mentors": active_data}, status=status.HTTP_200_OK)

class TutorListView(APIView):
    """
    GET /api/tutors/
    Returns list of active tutors with their assigned student counts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from django.db.models import Count
        
        # Query active tutors
        tutors = User.objects.filter(role='TUTOR').annotate(
            assigned_students_count=Count('tutored_students')
        ).order_by('-created_at')
        
        active_data = [
            {
                "kind": "active",
                "id": str(t.id),
                "full_name": t.full_name or "",
                "email": t.email,
                "avatar_url": t.avatar_url or None,
                "mobile_number": t.mobile_number or "",
                "created_at": t.created_at.isoformat(),
                "invited_by_profile": {
                    "id": str(t.invited_by.id),
                    "full_name": t.invited_by.full_name or "",
                    "email": t.invited_by.email
                } if t.invited_by else None,
                "assigned_students_count": t.assigned_students_count
            }
            for t in tutors
        ]
        
        # Backward compatibility for dropdown selects (which don't pass ?all=true)
        if request.GET.get('all') != 'true':
            return Response(
                {"tutors": [{"id": d["id"], "full_name": d["full_name"], "email": d["email"]} for d in active_data]},
                status=status.HTTP_200_OK
            )
            
        return Response({"tutors": active_data}, status=status.HTTP_200_OK)

class AdminListView(APIView):
    """
    GET /api/admins/
    Returns list of active admins.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        admins = User.objects.filter(role='ADMIN').order_by('-created_at')
        active_data = [
            {
                "kind": "active",
                "id": str(a.id),
                "full_name": a.full_name or "",
                "email": a.email,
                "avatar_url": a.avatar_url or None,
                "mobile_number": a.mobile_number or "",
                "created_at": a.created_at.isoformat(),
                "invited_by_profile": {
                    "id": str(a.invited_by.id),
                    "full_name": a.invited_by.full_name or "",
                    "email": a.invited_by.email
                } if a.invited_by else None,
                "assigned_students_count": None
            }
            for a in admins
        ]
        
        return Response({"admins": active_data}, status=status.HTTP_200_OK)

class UserDetailView(APIView):
    """
    PATCH /api/users/<id>/ - Edit User name and mobile number.
    DELETE /api/users/<id>/ - Delete User profile.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response(
                {"error": "FORBIDDEN", "message": "Only admins can edit user details."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        target_user = get_object_or_404(User, pk=pk)
        
        full_name = request.data.get("full_name")
        mobile_number = request.data.get("mobile_number")
        
        if full_name is not None:
            full_name = full_name.strip()
            if not full_name:
                return Response(
                    {"error": "INVALID_INPUT", "message": "Name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            target_user.full_name = full_name
            
        if "mobile_number" in request.data:
            target_user.mobile_number = mobile_number.strip() if mobile_number else None
            
        target_user.save()
        
        # Log activity
        ActivityLog.objects.create(
            actor=request.user,
            actor_email=request.user.email,
            actor_name=request.user.full_name,
            actor_role=request.user.role,
            action="USER_UPDATE",
            entity_type="USER",
            entity_id=str(target_user.id),
            entity_label=target_user.full_name or target_user.email,
            student=None,
            context={"changes": {"full_name": target_user.full_name, "mobile_number": target_user.mobile_number}}
        )
        
        return Response({"success": True, "profile": {
            "id": str(target_user.id),
            "full_name": target_user.full_name,
            "mobile_number": target_user.mobile_number,
            "email": target_user.email,
        }}, status=status.HTTP_200_OK)

    def delete(self, request, pk, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response(
                {"error": "FORBIDDEN", "message": "Only admins can delete users."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from django.shortcuts import get_object_or_404
        target_user = get_object_or_404(User, pk=pk)
        
        if target_user.role not in ('ADMIN', 'MENTOR', 'TUTOR'):
            return Response(
                {"error": "INVALID_ROLE", "message": "This user cannot be deleted from here."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if target_user.role == 'ADMIN':
            is_self = request.user.id == target_user.id
            is_inviter = target_user.invited_by is not None and target_user.invited_by.id == request.user.id
            
            if not is_self and not is_inviter:
                return Response(
                    {"error": "FORBIDDEN", "message": "Only the admin themselves or the person who invited them can delete an admin."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            if is_self:
                other_admins_count = User.objects.filter(role='ADMIN').exclude(id=request.user.id).count()
                if other_admins_count == 0:
                    return Response(
                        {"error": "LAST_ADMIN", "message": "You are the only admin. Promote another user before deleting your account."},
                        status=status.HTTP_409_CONFLICT
                    )
        
        # Log activity
        ActivityLog.objects.create(
            actor=request.user,
            actor_email=request.user.email,
            actor_name=request.user.full_name,
            actor_role=request.user.role,
            action="USER_DELETE",
            entity_type="USER",
            entity_id=str(target_user.id),
            entity_label=target_user.full_name or target_user.email,
            student=None,
            context={"role": target_user.role}
        )
        
        target_user.delete()
        return Response({"success": True}, status=status.HTTP_200_OK)

