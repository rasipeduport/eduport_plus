import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class InvitationRoleChoices(models.TextChoices):
    STUDENT = 'STUDENT', 'Student'
    MENTOR = 'MENTOR', 'Mentor'
    TUTOR = 'TUTOR', 'Tutor'

class InvitationStatusChoices(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    EXPIRED = 'EXPIRED', 'Expired'

class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(
        max_length=20,
        choices=InvitationRoleChoices.choices,
        db_index=True
    )
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_invitations'
    )
    status = models.CharField(
        max_length=20,
        choices=InvitationStatusChoices.choices,
        default=InvitationStatusChoices.PENDING,
        db_index=True
    )

    class Meta:
        db_table = 'whitelisted_emails'
        verbose_name = 'Invitation'
        verbose_name_plural = 'Invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.role}) - {self.status}"
