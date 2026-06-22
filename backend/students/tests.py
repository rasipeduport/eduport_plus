from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from students.models import Student
from invitations.models import Invitation, InvitationStatusChoices, InvitationRoleChoices

User = get_user_model()

class DashboardAPITests(APITestCase):
    def setUp(self):
        # Create different role users
        self.admin = User.objects.create_user(
            email="admin@eduport.com",
            password="password",
            full_name="Admin User",
            role="ADMIN"
        )
        self.mentor = User.objects.create_user(
            email="mentor@eduport.com",
            password="password",
            full_name="Mentor User",
            role="MENTOR"
        )
        self.tutor = User.objects.create_user(
            email="tutor@eduport.com",
            password="password",
            full_name="Tutor User",
            role="TUTOR"
        )
        self.student_user = User.objects.create_user(
            email="student@eduport.com",
            password="password",
            full_name="Student User",
            role="STUDENT"
        )

        # Create a Student record associated with student_user
        self.student = Student.objects.create(
            profile=self.student_user,
            student_code="EDP00009",
            full_name="Student User",
            mentor=self.mentor,
            tutor=self.tutor,
            total_class_quota=15,
            meet_link="https://meet.google.com/abc-defg-hij"
        )

        # Create a pending student invitation for stats check
        self.invitation = Invitation.objects.create(
            email="invited@gmail.com",
            role=InvitationRoleChoices.STUDENT,
            status=InvitationStatusChoices.PENDING,
            extra_data={"student_code": "EDP00010"}
        )

        self.stats_url = reverse('staff-dashboard-stats')
        self.student_db_url = reverse('student-dashboard')
        self.mentor_list_url = reverse('mentor-list')
        self.tutor_list_url = reverse('tutor-list')

    def test_stats_accessible_by_staff_only(self):
        # Unauthenticated
        response = self.client.get(self.stats_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Student user (forbidden)
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(self.stats_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Tutor user
        self.client.force_authenticate(user=self.tutor)
        response = self.client.get(self.stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["students"], 1)
        self.assertEqual(response.data["mentors"], 1)
        self.assertEqual(response.data["tutors"], 1)
        self.assertEqual(response.data["pending_invitations"], 1)

        # Mentor user
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get(self.stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Admin user
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_dashboard_accessible_by_student_only(self):
        # Unauthenticated
        response = self.client.get(self.student_db_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user (forbidden)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.student_db_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Student user
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(self.student_db_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["student_name"], "Student User")
        self.assertEqual(response.data["mentor"], "Mentor User")
        self.assertEqual(response.data["tutor"], "Tutor User")
        self.assertEqual(response.data["quota"], 15)
        self.assertEqual(response.data["meet_link"], "https://meet.google.com/abc-defg-hij")

    def test_mentor_and_tutor_lists(self):
        self.client.force_authenticate(user=self.admin)

        # Mentors list
        response = self.client.get(self.mentor_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["mentors"]), 1)
        self.assertEqual(response.data["mentors"][0]["full_name"], "Mentor User")

        # Tutors list
        response = self.client.get(self.tutor_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tutors"]), 1)
        self.assertEqual(response.data["tutors"][0]["full_name"], "Tutor User")

    def test_student_list_and_update(self):
        # Authenticate as admin
        self.client.force_authenticate(user=self.admin)
        
        # Test student list (GET /api/students/)
        url = reverse('students:student-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["student_code"], "EDP00009")
        
        # Test student update (PUT /api/students/)
        payload = {
            "id": str(self.student.id),
            "meet_link": "https://meet.google.com/xxx-yyyy-zzz",
            "total_class_quota": 20,
            "status": "INACTIVE",
            "status_note": "A temporary pause"
        }
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify database reflects updates
        self.student.refresh_from_db()
        self.assertEqual(self.student.meet_link, "https://meet.google.com/xxx-yyyy-zzz")
        self.assertEqual(self.student.total_class_quota, 20)
        self.assertEqual(self.student.status, "INACTIVE")
        self.assertEqual(self.student.status_note, "A temporary pause")

