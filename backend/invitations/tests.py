from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from .models import Invitation, InvitationStatusChoices, InvitationRoleChoices

User = get_user_model()

class InvitationFlowTests(APITestCase):
    def setUp(self):
        # Create users of different roles
        self.admin_user = User.objects.create_user(
            email="admin@eduport.com",
            password="password123",
            full_name="Admin User",
            role="ADMIN"
        )
        self.mentor_user = User.objects.create_user(
            email="mentor@eduport.com",
            password="password123",
            full_name="Mentor User",
            role="MENTOR"
        )
        self.student_user = User.objects.create_user(
            email="existing_student@gmail.com",
            password="password123",
            full_name="Student User",
            role="STUDENT"
        )
        self.lookup_url = reverse('invitations:lookup-student')
        self.create_url = reverse('invitations:create-student-invitation')

    # --- LOOKUP STUDENT TESTS ---

    def test_lookup_unauthenticated_rejected(self):
        response = self.client.post(self.lookup_url, {"student_code": "EDP00099"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lookup_student_role_rejected(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(self.lookup_url, {"student_code": "EDP00099"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lookup_mentor_role_allowed(self):
        self.client.force_authenticate(user=self.mentor_user)
        response = self.client.post(self.lookup_url, {})
        # Missing student_code returns 400 but validates role permission
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('invitations.views.GoogleSheetsService.lookup_student_by_code')
    def test_lookup_student_found_returns_details_without_db_write(self, mock_lookup):
        mock_lookup.return_value = {
            "student_code": "EDP00099",
            "email": "new_student@gmail.com",
            "full_name": "Jane Doe",
            "mobile_number": "+919876543210"
        }
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.lookup_url, {"student_code": "EDP00099"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "found")
        self.assertEqual(response.data["student_data"]["full_name"], "Jane Doe")
        
        # Verify NO DB entry was created
        self.assertFalse(Invitation.objects.filter(email="new_student@gmail.com").exists())

    @patch('invitations.views.GoogleSheetsService.lookup_student_by_code')
    def test_lookup_user_already_registered_returns_400(self, mock_lookup):
        mock_lookup.return_value = {
            "student_code": "EDP00099",
            "email": "existing_student@gmail.com", # Email of self.student_user
            "full_name": "Student User"
        }
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.lookup_url, {"student_code": "EDP00099"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "USER_ALREADY_REGISTERED")

    # --- CREATE INVITATION TESTS ---

    def test_create_unauthenticated_rejected(self):
        response = self.client.post(self.create_url, {"email": "test@gmail.com"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_student_role_rejected(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.post(self.create_url, {"email": "test@gmail.com"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_invitation_success_and_saves_in_db(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "student_code": "EDP00099",
            "email": "invited_student@gmail.com",
            "full_name": "Sarah Connor",
            "mobile_number": "+919876543210",
            "grade": "10",
            "syllabus": "CBSE",
            "meet_link": "https://meet.google.com/abc-defg-hij"
        }
        response = self.client.post(self.create_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "created")
        
        # Verify db entry
        invitation = Invitation.objects.filter(email="invited_student@gmail.com").first()
        self.assertIsNotNone(invitation)
        self.assertEqual(invitation.status, InvitationStatusChoices.PENDING)
        self.assertEqual(invitation.extra_data["student_code"], "EDP00099")
        self.assertEqual(invitation.extra_data["meet_link"], "https://meet.google.com/abc-defg-hij")
        self.assertEqual(invitation.invited_by, self.admin_user)

    def test_create_invitation_invalid_mentor_returns_400(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "student_code": "EDP00099",
            "email": "invited_student@gmail.com",
            "full_name": "Sarah Connor",
            "mentor_id": "00000000-0000-0000-0000-000000000000" # Invalid UUID
        }
        response = self.client.post(self.create_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "INVALID_MENTOR")

    def test_create_invitation_updates_pending_invitation(self):
        # Create an existing pending invitation
        existing_inv = Invitation.objects.create(
            email="pending_inv@gmail.com",
            role=InvitationRoleChoices.STUDENT,
            status=InvitationStatusChoices.PENDING,
            extra_data={"student_code": "EDP00099", "grade": "9"}
        )
        self.client.force_authenticate(user=self.mentor_user)
        payload = {
            "student_code": "EDP00099",
            "email": "pending_inv@gmail.com",
            "full_name": "Sarah Connor Updated",
            "grade": "10"
        }
        response = self.client.post(self.create_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "updated")
        
        existing_inv.refresh_from_db()
        self.assertEqual(existing_inv.extra_data["grade"], "10")
        self.assertEqual(existing_inv.extra_data["full_name"], "Sarah Connor Updated")
        self.assertEqual(existing_inv.invited_by, self.mentor_user)
