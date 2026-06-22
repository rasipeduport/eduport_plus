from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
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
    def test_lookup_tutor_role_forbidden(self, mock_lookup):
        tutor_user = User.objects.create_user(
            email="tutor@eduport.com",
            password="password123",
            full_name="Tutor User",
            role="TUTOR"
        )
        mock_lookup.return_value = {
            "student_code": "EDP00099",
            "email": "new_student_tutor@gmail.com",
            "full_name": "Jane Doe Tutor",
            "mobile_number": "+919876543210"
        }
        self.client.force_authenticate(user=tutor_user)
        response = self.client.post(self.lookup_url, {"student_code": "EDP00099"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Invitation.objects.filter(email="new_student_tutor@gmail.com").exists())


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

        # Verify email was sent and contains the correct Learn redirect link
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, ["invited_student@gmail.com"])
        self.assertIn("Student", sent_email.subject)
        self.assertIn("http://localhost:3001/login?email=invited_student@gmail.com", sent_email.body)

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

    def test_list_edit_and_delete_invitation(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # 1. Create a whitelisted invitation to test with
        existing_inv = Invitation.objects.create(
            email="test_invite@gmail.com",
            role=InvitationRoleChoices.STUDENT,
            status=InvitationStatusChoices.PENDING,
            extra_data={"student_code": "EDP00099"}
        )
        
        # 2. Test List GET /api/invitations/
        list_url = reverse('invitations:create-invitation')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["email"], "test_invite@gmail.com")
        
        # 3. Test Patch edit email PATCH /api/invitations/
        patch_payload = {
            "old_email": "test_invite@gmail.com",
            "new_email": "corrected_invite@gmail.com"
        }
        response = self.client.patch(list_url, patch_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Invitation.objects.filter(email="corrected_invite@gmail.com").exists())
        self.assertFalse(Invitation.objects.filter(email="test_invite@gmail.com").exists())
        
        # 4. Test Withdraw delete DELETE /api/invitations/
        delete_payload = {
            "email": "corrected_invite@gmail.com"
        }
        response = self.client.delete(list_url, delete_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Invitation.objects.filter(email="corrected_invite@gmail.com").exists())

    def test_mentor_invite_staff_role_forbidden(self):
        self.client.force_authenticate(user=self.mentor_user)
        payload = {
            "email": "staff_invite@gmail.com",
            "role": "TUTOR",
            "full_name": "Sarah Staff"
        }
        response = self.client.post(self.create_url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Invitation.objects.filter(email="staff_invite@gmail.com").exists())

    def test_mentor_patch_non_student_invitation_forbidden(self):
        # Create non-student invitation
        Invitation.objects.create(
            email="staff_invite@gmail.com",
            role=InvitationRoleChoices.TUTOR,
            status=InvitationStatusChoices.PENDING
        )
        self.client.force_authenticate(user=self.mentor_user)
        list_url = reverse('invitations:create-invitation')
        patch_payload = {
            "old_email": "staff_invite@gmail.com",
            "new_email": "corrected_staff@gmail.com"
        }
        response = self.client.patch(list_url, patch_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Invitation.objects.filter(email="staff_invite@gmail.com").exists())

    def test_mentor_delete_non_student_invitation_forbidden(self):
        # Create non-student invitation
        Invitation.objects.create(
            email="staff_invite@gmail.com",
            role=InvitationRoleChoices.TUTOR,
            status=InvitationStatusChoices.PENDING
        )
        self.client.force_authenticate(user=self.mentor_user)
        list_url = reverse('invitations:create-invitation')
        delete_payload = {
            "email": "staff_invite@gmail.com"
        }
        response = self.client.delete(list_url, delete_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Invitation.objects.filter(email="staff_invite@gmail.com").exists())

    def test_create_staff_invitation_sends_hub_email(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "email": "invited_tutor@eduport.com",
            "role": "TUTOR",
            "full_name": "Tutor Tim",
            "mobile_number": "+919876543211"
        }
        # Clear outbox
        mail.outbox.clear()
        
        response = self.client.post(self.create_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify email was sent and contains the Hub URL instead of Learn URL
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, ["invited_tutor@eduport.com"])
        self.assertIn("Tutor", sent_email.subject)
        self.assertIn("http://localhost:3000/login?email=invited_tutor@eduport.com", sent_email.body)

