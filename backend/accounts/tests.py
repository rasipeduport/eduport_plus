from django.urls import reverse
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from invitations.models import Invitation, InvitationStatusChoices, InvitationRoleChoices
from students.models import Student
from activity.models import ActivityLog

User = get_user_model()

@override_settings(ALLOW_MOCK_AUTH=True)
class GoogleAuthenticationTests(APITestCase):
    def setUp(self):
        self.login_url = reverse('accounts:google-login')
        self.logout_url = reverse('accounts:logout')
        self.me_url = reverse('accounts:me')

        # Define email whitelist details
        self.student_email = "student.jane@gmail.com"
        self.student_code = "EDP00123"

        # Create Mentor and Tutor for Student link tests
        self.test_mentor = User.objects.create_user(
            email="test_mentor@eduport.com",
            password="password123",
            full_name="Test Mentor",
            role="MENTOR"
        )
        self.test_tutor = User.objects.create_user(
            email="test_tutor@eduport.com",
            password="password123",
            full_name="Test Tutor",
            role="TUTOR"
        )

        # Create a pending student invitation
        self.student_invitation = Invitation.objects.create(
            email=self.student_email,
            role=InvitationRoleChoices.STUDENT,
            status=InvitationStatusChoices.PENDING,
            extra_data={
                "student_code": self.student_code,
                "full_name": "Jane Student",
                "mobile_number": "+919999999999",
                "grade": "11",
                "syllabus": "ICSE",
                "school_name": "St. Xavier School",
                "country": "India",
                "state": "Maharashtra",
                "admission_date": "2026-06-19",
                "total_class_quota": 10,
                "mentor_id": str(self.test_mentor.id),
                "tutor_id": str(self.test_tutor.id),
                "meet_link": "https://meet.google.com/abc-defg-hij"
            }
        )

        # Create a pending mentor invitation
        self.mentor_email = "mentor.mark@eduport.com"
        self.mentor_invitation = Invitation.objects.create(
            email=self.mentor_email,
            role=InvitationRoleChoices.MENTOR,
            status=InvitationStatusChoices.PENDING,
            extra_data={"full_name": "Mark Mentor"}
        )

    def test_login_missing_token_returns_400(self):
        response = self.client.post(self.login_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "INVALID_INPUT")

    def test_login_uninvited_email_returns_403(self):
        # Use mock token fallback for uninvited email
        mock_token = "mock:uninvited@gmail.com:Uninvited User:https://example.com/pic.png"
        response = self.client.post(self.login_url, {"credential": mock_token})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "INVITATION_REQUIRED")
        
        # Verify no User profile was created
        self.assertFalse(User.objects.filter(email="uninvited@gmail.com").exists())

    def test_login_first_time_student_onboards_and_creates_records(self):
        # 1. Login with whitelisted student email
        mock_token = f"mock:{self.student_email}:Jane Google Profile:https://lh3.googleusercontent.com/a"
        response = self.client.post(self.login_url, {"credential": mock_token})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "onboarded")
        self.assertTrue(response.data["is_new_user"])
        
        # 2. Verify User profile created
        user = User.objects.filter(email=self.student_email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, 'STUDENT')
        self.assertEqual(user.full_name, "Jane Google Profile") # Google profile name prioritized
        self.assertEqual(user.avatar_url, "https://lh3.googleusercontent.com/a")
        
        # 3. Verify Student record created with same code
        student = Student.objects.filter(profile=user).first()
        self.assertIsNotNone(student)
        self.assertEqual(student.student_code, self.student_code)
        self.assertEqual(student.grade, "11")
        self.assertEqual(student.school_name, "St. Xavier School")
        self.assertEqual(str(student.admission_date), "2026-06-19")
        self.assertEqual(student.total_class_quota, 10)
        self.assertEqual(student.mentor, self.test_mentor)
        self.assertEqual(student.tutor, self.test_tutor)
        self.assertEqual(student.meet_link, "https://meet.google.com/abc-defg-hij")
        
        # 4. Verify Invitation marked ACCEPTED
        self.student_invitation.refresh_from_db()
        self.assertEqual(self.student_invitation.status, InvitationStatusChoices.ACCEPTED)

        # 5. Verify Activity Log
        log = ActivityLog.objects.filter(actor=user, action="ONBOARDED").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.entity_type, "USER")
        self.assertEqual(log.entity_id, str(user.id))
        self.assertEqual(log.student, student)

    def test_login_first_time_mentor_onboards_without_student_record(self):
        mock_token = f"mock:{self.mentor_email}:Mark Mentor:https://lh3.googleusercontent.com/b"
        response = self.client.post(self.login_url, {"credential": mock_token})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "onboarded")
        
        # Verify User created
        user = User.objects.filter(email=self.mentor_email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, 'MENTOR')
        
        # Verify NO student record was created
        self.assertFalse(Student.objects.filter(profile=user).exists())

    def test_subsequent_login_direct_session(self):
        # Onboard first
        mock_token = f"mock:{self.student_email}:Jane Google:https://lh3.googleusercontent.com/a"
        self.client.post(self.login_url, {"credential": mock_token})
        
        # Clear client session
        self.client.logout()

        # Login again
        response = self.client.post(self.login_url, {"credential": mock_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "authenticated")
        self.assertFalse(response.data["is_new_user"])

        # Check ActivityLog for second login
        user = User.objects.get(email=self.student_email)
        login_log = ActivityLog.objects.filter(actor=user, action="LOGIN").first()
        self.assertIsNotNone(login_log)

    def test_disabled_user_login_rejected(self):
        # Onboard first
        mock_token = f"mock:{self.student_email}:Jane Google:https://lh3.googleusercontent.com/a"
        self.client.post(self.login_url, {"credential": mock_token})
        
        # Disable user
        user = User.objects.get(email=self.student_email)
        user.is_active = False
        user.save()

        # Attempt login again
        response = self.client.post(self.login_url, {"credential": mock_token})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "USER_DISABLED")

    def test_logout_clears_session(self):
        # Login student
        mock_token = f"mock:{self.student_email}:Jane Google:https://lh3.googleusercontent.com/a"
        login_res = self.client.post(self.login_url, {"credential": mock_token})
        
        # Request me (should work)
        me_res = self.client.get(self.me_url)
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)

        # Logout
        logout_res = self.client.post(self.logout_url)
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Request me again (should fail)
        me_res2 = self.client.get(self.me_url)
        self.assertEqual(me_res2.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_returns_profile_details(self):
        # Onboard and login
        mock_token = f"mock:{self.student_email}:Jane Google:https://lh3.googleusercontent.com/a"
        self.client.post(self.login_url, {"credential": mock_token})

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], self.student_email)
        self.assertEqual(response.data["student_profile"]["student_code"], self.student_code)
