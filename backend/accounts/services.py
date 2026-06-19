import logging
from datetime import datetime
from django.db import transaction
from django.utils.dateparse import parse_date
from django.contrib.auth import get_user_model
from invitations.models import Invitation, InvitationStatusChoices, InvitationRoleChoices
from students.models import Student, StatusChoices
from activity.models import ActivityLog

logger = logging.getLogger(__name__)
User = get_user_model()

def parse_admission_date(date_str):
    """
    Tries parsing a date string from Google Sheets with various formats.
    """
    if not date_str:
        return None
    
    # Clean string
    date_str = str(date_str).strip()
    
    # Try standard YYYY-MM-DD
    parsed = parse_date(date_str)
    if parsed:
        return parsed
        
    # Try other formats
    for fmt in ("%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
            
    logger.warning(f"Could not parse admission date string: '{date_str}'")
    return None

class UserProvisioningService:
    @staticmethod
    @transaction.atomic
    def provision_user(email: str, google_name: str, google_avatar: str) -> User:
        """
        Provisions a User and matching Student record if role is STUDENT,
        inside an atomic database transaction.
        """
        logger.info(f"Attempting to provision user profile for email: {email}")

        # 1. Fetch PENDING invitation
        invitation = Invitation.objects.filter(
            email=email, 
            status=InvitationStatusChoices.PENDING
        ).first()
        
        if not invitation:
            logger.error(f"No pending invitation found for email {email}")
            raise ValueError("No pending invitation found for this email address.")

        extra_data = invitation.extra_data or {}
        
        # Determine name to use (Google name prioritized, fallback to sheet name)
        fullname = google_name or extra_data.get("full_name") or invitation.email.split("@")[0]

        # 2. Create User Profile
        user = User.objects.create(
            email=email,
            full_name=fullname,
            avatar_url=google_avatar,
            role=invitation.role,
            invited_by=invitation.invited_by,
            is_active=True,
            is_staff=False if invitation.role == InvitationRoleChoices.STUDENT else True
        )
        user.set_unusable_password()
        user.save()

        student = None

        # 3. Create Student record if role is STUDENT
        if invitation.role == InvitationRoleChoices.STUDENT:
            student_code = extra_data.get("student_code")
            if not student_code:
                # Fallback if student_code was somehow not mapped in extra_data
                logger.error(f"Student invitation for {email} is missing student_code in extra_data.")
                raise ValueError("Student code is missing from the invitation data.")
                
            admission_date_raw = extra_data.get("admission_date")
            admission_date = parse_admission_date(admission_date_raw)

            # Resolve Mentor and Tutor if IDs are provided
            mentor_id = extra_data.get("mentor_id")
            mentor = None
            if mentor_id:
                try:
                    mentor = User.objects.get(id=mentor_id)
                except User.DoesNotExist:
                    logger.warning(f"Mentor with ID {mentor_id} not found during student registration.")

            tutor_id = extra_data.get("tutor_id")
            tutor = None
            if tutor_id:
                try:
                    tutor = User.objects.get(id=tutor_id)
                except User.DoesNotExist:
                    logger.warning(f"Tutor with ID {tutor_id} not found during student registration.")

            meet_link = extra_data.get("meet_link", "")

            student = Student.objects.create(
                profile=user,
                student_code=student_code,
                full_name=fullname,
                mobile_number=extra_data.get("mobile_number"),
                country=extra_data.get("country"),
                state=extra_data.get("state"),
                school_name=extra_data.get("school_name"),
                grade=extra_data.get("grade"),
                syllabus=extra_data.get("syllabus"),
                admission_date=admission_date,
                total_class_quota=extra_data.get("total_class_quota", 0),
                mentor=mentor,
                tutor=tutor,
                meet_link=meet_link,
                status=StatusChoices.ACTIVE
            )
            logger.info(f"Student record created for user {email} with code {student_code}")

        # 4. Mark Invitation as ACCEPTED
        invitation.status = InvitationStatusChoices.ACCEPTED
        invitation.save()

        # 5. Log Activity
        ActivityLog.objects.create(
            actor=user,
            actor_email=user.email,
            actor_name=user.full_name,
            actor_role=user.role,
            action="ONBOARDED",
            entity_type="USER",
            entity_id=str(user.id),
            entity_label=user.full_name,
            student=student,
            context={"invitation_id": str(invitation.id)}
        )

        logger.info(f"Successfully onboarded user {email} with role {user.role}")
        return user
