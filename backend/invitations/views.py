from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import Invitation, InvitationStatusChoices, InvitationRoleChoices
from .sheets import GoogleSheetsService

User = get_user_model()

class IsAdminOrMentor(BasePermission):
    """
    Allows access only to users with the ADMIN or MENTOR roles, or superusers.
    """
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and (request.user.role in ('ADMIN', 'MENTOR') or request.user.is_superuser)
        )

class LookupStudentView(APIView):
    """
    Step 1: Admin or Mentor enters a student code.
    Backend fetches the data from the Google Sheet (range A3:AB of 'enrollment data' tab) on demand.
    Returns the mapped data directly without writing to the database yet.
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentor]

    def post(self, request, *args, **kwargs):
        student_code = request.data.get("student_code")
        if not student_code:
            return Response(
                {"error": "INVALID_INPUT", "message": "student_code is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Query Google Sheets using the production mapping
        try:
            student_data = GoogleSheetsService.lookup_student_by_code(student_code)
        except Exception as e:
            return Response(
                {"error": "SHEETS_API_ERROR", "message": f"Google Sheets lookup failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if not student_data:
            return Response(
                {"error": "STUDENT_NOT_FOUND", "message": f"Student with code '{student_code}' not found in the Google Sheet."},
                status=status.HTTP_404_NOT_FOUND
            )

        email = student_data.get("email")
        if not email:
            return Response(
                {"error": "MISSING_EMAIL", "message": "Student record found in sheet but email address is missing."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # Check if the user is already registered
        if User.objects.filter(email=email).exists():
            return Response(
                {
                    "error": "USER_ALREADY_REGISTERED",
                    "message": f"A user with email '{email}' is already registered in the system.",
                    "student_data": student_data
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if an invitation already exists
        invitation = Invitation.objects.filter(email=email).first()
        if invitation:
            if invitation.status == InvitationStatusChoices.ACCEPTED:
                return Response(
                    {
                        "error": "INVITATION_ALREADY_ACCEPTED",
                        "message": f"An invitation for '{email}' has already been accepted.",
                        "student_data": student_data
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(
                {
                    "status": "exists",
                    "message": f"A pending invitation already exists for '{email}'. You can update it by submitting details.",
                    "student_data": student_data,
                    "invitation": {
                        "id": invitation.id,
                        "email": invitation.email,
                        "role": invitation.role,
                        "status": invitation.status,
                        "extra_data": invitation.extra_data
                    }
                },
                status=status.HTTP_200_OK
            )

        # No invitation exists, return the sheet data so the admin can proceed
        return Response(
            {
                "status": "found",
                "message": "Student record found in Google Sheets.",
                "student_data": student_data
            },
            status=status.HTTP_200_OK
        )

class CreateInvitationView(APIView):
    """
    Step 2: Admin or Mentor selects Mentor/Tutor/Meet Link and submits to create invitation whitelisting for students,
    or whitelists an Admin, Mentor, or Tutor by email directly.
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentor]

    def post(self, request, *args, **kwargs):
        data = request.data
        role = data.get("role", "STUDENT").upper()
        email = data.get("email")

        if role not in ("STUDENT", "MENTOR", "TUTOR", "ADMIN"):
            return Response(
                {"error": "INVALID_ROLE", "message": "Invalid invitation role specified."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email or not email.strip():
            return Response(
                {"error": "INVALID_INPUT", "message": "email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.strip().lower()

        # Double check existing user
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "USER_ALREADY_REGISTERED", "message": f"User with email '{email}' is already registered."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update the Invitation whitelist record
        with transaction.atomic():
            invitation = Invitation.objects.filter(email=email).first()

            if invitation and invitation.status == InvitationStatusChoices.ACCEPTED:
                return Response(
                    {"error": "INVITATION_ALREADY_ACCEPTED", "message": "This invitation has already been accepted."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if role == "STUDENT":
                student_code = data.get("student_code")
                full_name = data.get("full_name")
                if not student_code or not full_name:
                    return Response(
                        {"error": "INVALID_INPUT", "message": "student_code and full_name are required fields for students."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                mentor_id = data.get("mentor_id")
                if mentor_id:
                    if not User.objects.filter(id=mentor_id).exists():
                        return Response(
                            {"error": "INVALID_MENTOR", "message": f"Mentor with ID '{mentor_id}' does not exist."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                tutor_id = data.get("tutor_id")
                if tutor_id:
                    if not User.objects.filter(id=tutor_id).exists():
                        return Response(
                            {"error": "INVALID_TUTOR", "message": f"Tutor with ID '{tutor_id}' does not exist."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                extra_data = {
                    "student_code": student_code,
                    "full_name": full_name,
                    "mobile_number": data.get("mobile_number", ""),
                    "country": data.get("country", ""),
                    "state": data.get("state", ""),
                    "school_name": data.get("school_name", ""),
                    "grade": data.get("grade", ""),
                    "syllabus": data.get("syllabus", ""),
                    "admission_date": data.get("admission_date", ""),
                    "remarks": data.get("remarks", ""),
                    "mentor_id": mentor_id,
                    "tutor_id": tutor_id,
                    "meet_link": data.get("meet_link", "")
                }
            else:
                # Staff roles (ADMIN, MENTOR, TUTOR)
                full_name = data.get("full_name", "")
                extra_data = {
                    "full_name": full_name,
                    "mobile_number": data.get("mobile_number", "")
                }

            if invitation:
                invitation.role = role
                invitation.extra_data = extra_data
                invitation.invited_by = request.user
                invitation.status = InvitationStatusChoices.PENDING
                invitation.save()
                status_str = "updated"
                res_status = status.HTTP_200_OK
            else:
                invitation = Invitation.objects.create(
                    email=email,
                    role=role,
                    extra_data=extra_data,
                    invited_by=request.user,
                    status=InvitationStatusChoices.PENDING
                )
                status_str = "created"
                res_status = status.HTTP_201_CREATED

            return Response(
                {
                    "status": status_str,
                    "message": f"Invitation for '{email}' has been successfully {status_str}.",
                    "invitation": {
                        "id": invitation.id,
                        "email": invitation.email,
                        "role": invitation.role,
                        "status": invitation.status
                    }
                },
                status=res_status
            )
