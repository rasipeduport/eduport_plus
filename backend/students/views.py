from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated

from students.models import Student
from invitations.models import Invitation, InvitationStatusChoices

User = get_user_model()

class IsStaffUser(BasePermission):
    """
    Allows access only to Admin, Mentor, or Tutor roles, or superusers.
    """
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and (request.user.role in ('ADMIN', 'MENTOR', 'TUTOR') or request.user.is_superuser)
        )

class IsStudentUser(BasePermission):
    """
    Allows access only to Student role.
    """
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role == 'STUDENT'
        )

class StaffDashboardStatsView(APIView):
    """
    GET /api/dashboard/stats/
    Returns the numbers of students, mentors, tutors, and pending invitations.
    Visible to: Admin, Mentor, Tutor
    """
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        students_count = Student.objects.count()
        mentors_count = User.objects.filter(role='MENTOR').count()
        tutors_count = User.objects.filter(role='TUTOR').count()
        pending_invites_count = Invitation.objects.filter(status=InvitationStatusChoices.PENDING).count()

        return Response({
            "students": students_count,
            "mentors": mentors_count,
            "tutors": tutors_count,
            "pending_invitations": pending_invites_count
        }, status=status.HTTP_200_OK)

class StudentDashboardView(APIView):
    """
    GET /api/student/dashboard/
    Returns the student's dashboard details.
    Visible to: Student
    """
    permission_classes = [IsStudentUser]

    def get(self, request, *args, **kwargs):
        student = Student.objects.filter(profile=request.user).first()
        if not student:
            return Response(
                {
                    "error": "STUDENT_PROFILE_NOT_FOUND",
                    "message": "Your profile is waiting to be linked with student records."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "student_name": student.full_name or request.user.full_name or "",
            "mentor": student.mentor.full_name if student.mentor else None,
            "tutor": student.tutor.full_name if student.tutor else None,
            "quota": student.total_class_quota,
            "meet_link": student.meet_link or ""
        }, status=status.HTTP_200_OK)
