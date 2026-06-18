import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from students.models import Student

class SessionStatusChoices(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    ATTENDED = 'ATTENDED', 'Attended'
    CANCELLED = 'CANCELLED', 'Cancelled'

class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    recording_link = models.TextField(blank=True, null=True)
    notes_link = models.TextField(blank=True, null=True)
    homework_link = models.TextField(blank=True, null=True)
    
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        blank=True,
        null=True
    )
    status = models.CharField(
        max_length=20,
        choices=SessionStatusChoices.choices,
        default=SessionStatusChoices.SCHEDULED,
        db_index=True
    )
    cancellation_reason = models.TextField(blank=True, null=True)
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_sessions'
    )
    series_id = models.UUIDField(blank=True, null=True, db_index=True)
    class_number = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = 'sessions'
        verbose_name = 'Session'
        verbose_name_plural = 'Sessions'
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.title} - {self.student.full_name} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"
